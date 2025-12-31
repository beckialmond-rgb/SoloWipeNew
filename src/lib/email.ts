/**
 * Email Utility Functions
 * 
 * Reusable functions for sending emails via Resend.
 * This module provides email sending capabilities for the SoloWipe application.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Email sending configuration
 */
export interface EmailConfig {
  to: string | string[];
  subject: string;
  html: string; // Required for edge function
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 * 
 * This function should be called from a Supabase Edge Function or server-side code.
 * For client-side usage, wrap this in a Supabase Edge Function.
 * 
 * @param config - Email configuration
 * @param resendApiKey - Resend API key (from environment variable)
 * @returns Promise with email sending result
 */
export async function sendEmail(
  config: EmailConfig,
  resendApiKey: string
): Promise<EmailResult> {
  try {
    // Import Resend dynamically (for edge functions compatibility)
    const { Resend } = await import('resend');
    
    const resend = new Resend(resendApiKey);

    const result = await resend.emails.send({
      from: config.from || 'Solowipe Team <noreply@solowipe.co.uk>',
      to: Array.isArray(config.to) ? config.to : [config.to],
      subject: config.subject,
      html: config.html,
      text: config.text,
      reply_to: config.replyTo,
      tags: config.tags,
    });

    if (result.error) {
      console.error('[sendEmail] Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('[sendEmail] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a welcome/confirmation email
 * 
 * @param email - Recipient email address
 * @param confirmationUrl - URL for email confirmation
 * @param resendApiKey - Resend API key
 * @returns Promise with email sending result
 */
export async function sendConfirmationEmail(
  email: string,
  confirmationUrl: string,
  resendApiKey: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your SoloWipe account</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0080FF 0%, #0066CC 100%); padding: 40px 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">SoloWipe</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Verify your email address</h2>
                    <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      Thanks for signing up for SoloWipe! Please click the button below to verify your email address and get started.
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 30px;">
                          <a href="${confirmationUrl}" style="display: inline-block; background-color: #0080FF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                      If the button doesn't work, you can copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0; color: #0080FF; font-size: 14px; word-break: break-all;">
                      <a href="${confirmationUrl}" style="color: #0080FF; text-decoration: underline;">${confirmationUrl}</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                      This email was sent by <strong>SoloWipe Team</strong>. If you didn't create an account, you can safely ignore this email.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} SoloWipe. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Verify your SoloWipe account

Thanks for signing up for SoloWipe! Please click the link below to verify your email address and get started.

${confirmationUrl}

This email was sent by SoloWipe Team. If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} SoloWipe. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Verify your SoloWipe account',
    html,
    text,
    from: 'Solowipe Team <noreply@solowipe.co.uk>',
    tags: [
      { name: 'category', value: 'email_verification' },
    ],
  }, resendApiKey);
}

/**
 * Generate welcome email HTML template
 * Matches the React Email template design but uses static HTML for client-side rendering
 */
function generateWelcomeEmailHTML(
  userEmail: string,
  dashboardUrl: string,
  businessName?: string
): string {
  const displayName = userEmail.split('@')[0];
  
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SoloWipe</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header with gradient -->
            <tr>
              <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 48px 40px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SoloWipe</h1>
              </td>
            </tr>
            
            <!-- Main content -->
            <tr>
              <td style="padding: 48px 40px;">
                <h2 style="margin: 0 0 24px; color: #111827; font-size: 24px; font-weight: 600;">Welcome to SoloWipe!</h2>
                
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                  Hi ${displayName},
                </p>
                
                <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                  Thanks for joining SoloWipe! You're all set to streamline your window cleaning business and focus on what matters most—delivering great service to your customers.
                </p>
                
                <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                  Let's get to work.
                </p>
                
                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                  <tr>
                    <td align="center">
                      <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
                
                <!-- Helpful links -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 32px; margin-top: 32px;">
                  <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; font-weight: 600;">Quick start tips:</p>
                  <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">• Add your first customer to get started</p>
                  <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">• Schedule recurring jobs automatically</p>
                  <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">• Set up Direct Debit for seamless payments</p>
                </div>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  This email was sent by <strong>SoloWipe Team</strong>. If you have any questions, we're here to help.
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © ${new Date().getFullYear()} SoloWipe. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

/**
 * Send welcome email to new user via Supabase Edge Function
 * 
 * This function calls the send-email edge function with the welcome email template.
 * 
 * @param userEmail - User's email address
 * @param dashboardUrl - URL to redirect user to dashboard (defaults to current origin)
 * @param businessName - Optional business name for personalization (currently unused but reserved for future)
 * @returns Promise with email sending result
 */
export async function sendWelcomeEmail(
  userEmail: string,
  dashboardUrl?: string,
  businessName?: string
): Promise<EmailResult> {
  try {
    // Validate email
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      return {
        success: false,
        error: 'Invalid email address',
      };
    }

    // Get current session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[sendWelcomeEmail] Session error:', sessionError);
      return {
        success: false,
        error: 'Authentication required to send email',
      };
    }

    // Default dashboard URL
    const defaultDashboardUrl = dashboardUrl || `${window.location.origin}/dashboard`;
    
    // Generate HTML email template
    const emailHtml = generateWelcomeEmailHTML(userEmail, defaultDashboardUrl, businessName);

    // Generate plain text version
    const emailText = `
Welcome to SoloWipe!

Hi ${userEmail.split('@')[0]},

Thanks for joining SoloWipe! You're all set to streamline your window cleaning business.

Let's get to work.

Go to Dashboard: ${defaultDashboardUrl}

Quick start tips:
• Add your first customer to get started
• Schedule recurring jobs automatically
• Set up Direct Debit for seamless payments

© ${new Date().getFullYear()} SoloWipe. All rights reserved.
    `.trim();

    // Call the send-email edge function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: 'Welcome to SoloWipe!',
        html: emailHtml,
        text: emailText,
        tags: [
          { name: 'category', value: 'welcome_email' },
          { name: 'type', value: 'onboarding' },
        ],
      },
    });

    if (error) {
      console.error('[sendWelcomeEmail] Edge function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send welcome email',
      };
    }

    if (data?.error) {
      console.error('[sendWelcomeEmail] Email sending error:', data.error);
      return {
        success: false,
        error: data.error,
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to send welcome email',
      };
    }

    return {
      success: true,
      messageId: data?.messageId,
    };
  } catch (error) {
    console.error('[sendWelcomeEmail] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

