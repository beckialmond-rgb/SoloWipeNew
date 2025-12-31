-- Migration: Add Welcome Email Trigger
-- Description: Automatically sends welcome email when a new user is confirmed
-- 
-- This creates a Postgres function that calls the send-email edge function
-- when a user's email is confirmed in auth.users

-- Enable pg_net extension for HTTP requests (required for calling edge functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  edge_function_url TEXT;
  user_email TEXT;
  dashboard_url TEXT;
  email_html TEXT;
  email_text TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Only send email if user is confirmed (email verified)
  IF NEW.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get user email
  user_email := NEW.email;
  
  IF user_email IS NULL OR user_email = '' THEN
    RAISE WARNING 'User % has no email address, skipping welcome email', NEW.id;
    RETURN NEW;
  END IF;

  -- Get Supabase project URL from environment or use default
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Try to get from Supabase's internal config
    SELECT COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://owqjyaiptexqwafzmcwy.supabase.co'
    ) INTO supabase_url;
  END IF;

  edge_function_url := supabase_url || '/functions/v1/send-email';
  dashboard_url := COALESCE(
    current_setting('app.settings.dashboard_url', true),
    'https://solowipe.co.uk/dashboard'
  );

  -- Generate email HTML (matches the template in src/lib/email.ts)
  email_html := format('
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SoloWipe</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', ''Roboto'', ''Oxygen'', ''Ubuntu'', ''Cantarell'', sans-serif; background-color: #f9fafb;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="background: linear-gradient(135deg, #2563eb 0%%, #1e40af 100%%); padding: 48px 40px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SoloWipe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 48px 40px;">
                <h2 style="margin: 0 0 24px; color: #111827; font-size: 24px; font-weight: 600;">Welcome to SoloWipe!</h2>
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">Hi %s,</p>
                <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">Thanks for joining SoloWipe! You''re all set to streamline your window cleaning business and focus on what matters most—delivering great service to your customers.</p>
                <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">Let''s get to work.</p>
                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                  <tr>
                    <td align="center">
                      <a href="%s" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 32px; margin-top: 32px;">
                  <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; font-weight: 600;">Quick start tips:</p>
                  <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">• Add your first customer to get started</p>
                  <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">• Schedule recurring jobs automatically</p>
                  <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">• Set up Direct Debit for seamless payments</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">This email was sent by <strong>SoloWipe Team</strong>. If you have any questions, we''re here to help.</p>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">© %s SoloWipe. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  ', 
    split_part(user_email, '@', 1),
    dashboard_url,
    EXTRACT(YEAR FROM NOW())
  );

  -- Generate plain text version
  email_text := format('
Welcome to SoloWipe!

Hi %s,

Thanks for joining SoloWipe! You''re all set to streamline your window cleaning business.

Let''s get to work.

Go to Dashboard: %s

Quick start tips:
• Add your first customer to get started
• Schedule recurring jobs automatically
• Set up Direct Debit for seamless payments

© %s SoloWipe. All rights reserved.
  ',
    split_part(user_email, '@', 1),
    dashboard_url,
    EXTRACT(YEAR FROM NOW())
  );

  -- Call the send-email edge function via pg_net HTTP
  -- Note: This requires the service_role key to be set as a secret
  -- The edge function will validate the Authorization header
  -- 
  -- Using pg_net.http_post for Supabase compatibility
  -- Fix: Use CTE to properly extract fields from record returned by net.http_post
  WITH http_request AS (
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.settings.service_role_key', true),
          current_setting('app.supabase_service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'to', user_email,
        'subject', 'Welcome to SoloWipe!',
        'html', email_html,
        'text', email_text,
        'tags', jsonb_build_array(
          jsonb_build_object('name', 'category', 'value', 'welcome_email'),
          jsonb_build_object('name', 'type', 'value', 'onboarding')
        )
      )::text
    ) AS response
  )
  SELECT 
    (response).status,
    (response).content
  INTO response_status, response_body
  FROM http_request;

  -- Log the response (non-blocking - don't fail the trigger if email fails)
  IF response_status != 200 THEN
    RAISE WARNING 'Welcome email failed for user %: HTTP % - %', 
      NEW.id, response_status, response_body;
  ELSE
    RAISE NOTICE 'Welcome email sent successfully to %', user_email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error sending welcome email to %: %', user_email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- This fires when a user's email_confirmed_at changes from NULL to a timestamp
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.send_welcome_email();

-- Alternative: Trigger on user creation if email is already confirmed
-- (e.g., OAuth users who are auto-confirmed)
DROP TRIGGER IF EXISTS on_user_created_confirmed ON auth.users;
CREATE TRIGGER on_user_created_confirmed
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.send_welcome_email();

-- Grant execute permission to authenticated users (required for SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.send_welcome_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_email() TO service_role;

-- IMPORTANT: Database triggers with HTTP calls can be complex.
-- RECOMMENDED: Use Supabase Database Webhooks instead (see WELCOME_EMAIL_SETUP.md)
--
-- To use this trigger, you need:
-- 1. Enable pg_net extension: Supabase Dashboard → Database → Extensions → Enable "pg_net"
-- 2. Set the service_role_key (get from Supabase Dashboard → Settings → API):
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
-- 3. Set Supabase URL (if different):
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--
-- ALTERNATIVE (Recommended): Use Supabase Database Webhooks
-- 1. Go to Supabase Dashboard → Database → Webhooks
-- 2. Create a new webhook:
--    - Name: send-welcome-email
--    - Table: auth.users
--    - Events: UPDATE (when email_confirmed_at changes)
--    - HTTP Request:
--      - Method: POST
--      - URL: https://your-project.supabase.co/functions/v1/send-email
--      - Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--      - Body: See WELCOME_EMAIL_SETUP.md for template

