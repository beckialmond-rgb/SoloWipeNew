import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS configuration (inlined from _shared/cors.ts for deployment compatibility)
 * Provides secure CORS headers based on allowed origins
 */
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  
  // Default allowed origins for production and development
  return [
    'https://solowipe.co.uk',
    'https://www.solowipe.co.uk',
    'https://solowipe.lovable.app',
    'https://lovable.app',
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Common dev port
  ];
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check for localhost with any port (development)
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true;
  }
  
  return false;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowedOrigin = isOriginAllowed(origin) ? origin : getAllowedOrigins()[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Helper Invite Edge Function
 * 
 * Allows Owners to invite Helpers via email with magic link.
 * 
 * Flow:
 * 1. Owner calls this function with helper email
 * 2. Function generates unique invite token
 * 3. Function creates/updates team_members record with token
 * 4. Function sends invite email via send-email function
 * 5. Helper clicks link → Auth.tsx handles signup
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INVITE-HELPER] ${step}${detailsStr}`);
};

interface InviteRequest {
  helperEmail: string;
  helperName?: string;
}

interface InviteResponse {
  success: boolean;
  inviteToken?: string;
  inviteUrl?: string;
  helperId?: string;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight - MUST return 200 OK explicitly
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,  // Explicitly set status to 200 OK for CORS preflight
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." } as InviteResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Authenticate requester (must be Owner)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Invalid authentication", { error: authError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // 2. Verify requester is an Owner (has customers)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .limit(1);

    // Phase 4: Check role field first, then fallback to customers check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let isOwner = false;
    
    if (profile?.role === 'owner' || profile?.role === 'both') {
      isOwner = true;
    } else if (profile?.role === 'helper') {
      isOwner = false;
    } else {
      // Fallback: check customers (temporary during migration)
      if (customersError) {
        logStep("ERROR: Failed to check customers", { error: customersError.message });
        return new Response(
          JSON.stringify({ success: false, error: "Failed to verify owner status" } as InviteResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
      isOwner = (customers?.length ?? 0) > 0;
    }

    if (!isOwner) {
      logStep("ERROR: User is not an owner", { userId: user.id, role: profile?.role });
      return new Response(
        JSON.stringify({ success: false, error: "Only owners can invite helpers" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("Owner verified", { ownerId: user.id });

    // 3. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      logStep("ERROR: Invalid JSON", { error: String(error) });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { helperEmail, helperName }: InviteRequest = body as InviteRequest;
    
    if (!helperEmail || typeof helperEmail !== 'string' || !helperEmail.includes('@')) {
      logStep("ERROR: Invalid email", { email: helperEmail });
      return new Response(
        JSON.stringify({ success: false, error: "Valid email required" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const normalizedEmail = helperEmail.toLowerCase().trim();
    logStep("Processing invite", { email: normalizedEmail, name: helperName });

    // 4. Generate secure invite token (UUID)
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    logStep("Token generated", { token: inviteToken.substring(0, 8) + '...', expiresAt: expiresAt.toISOString() });

    // 5. Check if team member already exists for this owner+email
    const { data: existing, error: checkError } = await supabase
      .from('team_members')
      .select('id, helper_id, invite_token, invite_accepted_at')
      .eq('owner_id', user.id)
      .eq('helper_email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      logStep("ERROR: Failed to check existing helper", { error: checkError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check existing helper" } as InviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    let helperId: string;

    if (existing) {
      // Update existing team member with new invite
      helperId = existing.helper_id;
      
      // Verify placeholder user exists (in case it was deleted)
      const { data: { user: existingUser }, error: userCheckError } = await supabase.auth.admin.getUserById(helperId);
      
      if (userCheckError || !existingUser) {
        // User doesn't exist - create it
        logStep("Placeholder user missing, creating it", { helper_id: helperId });
        const { data: { user: newUser }, error: createUserError } = await supabase.auth.admin.createUser({
          id: helperId,
          email: normalizedEmail,
          email_confirm: false,
          user_metadata: {
            is_placeholder: true,
            helper_email: normalizedEmail,
          },
        });
        
        if (createUserError || !newUser) {
          logStep("WARNING: Failed to create missing placeholder user", { error: createUserError?.message });
          // Continue anyway - accept-invite will handle it, but log the warning
        } else {
          logStep("Created missing placeholder user", { user_id: newUser.id });
        }
      }
      
      // If invite was already accepted, still allow resending invite
      if (existing.invite_accepted_at) {
        logStep("WARNING: Helper already accepted invite - resending", { helperId });
      }

      const { error: updateError } = await supabase
        .from('team_members')
        .update({
          invite_token: inviteToken,
          invited_at: new Date().toISOString(),
          invite_expires_at: expiresAt.toISOString(),
          invite_accepted_at: null, // Reset if resending
          helper_name: helperName || existing.helper_name || null,
        })
        .eq('id', existing.id);

      if (updateError) {
        logStep("ERROR: Failed to update team member", { error: updateError.message });
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update helper invite" } as InviteResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Updated existing helper", { helperId });
    } else {
      // Create new placeholder helper (will be matched to real user when they sign in)
      helperId = crypto.randomUUID();
      logStep("Creating placeholder helper", { helperId });
      
      // CRITICAL: Create placeholder user in auth.users first
      const { data: { user: placeholderUser }, error: createUserError } = await supabase.auth.admin.createUser({
        id: helperId, // Use the same UUID as helper_id
        email: normalizedEmail,
        email_confirm: false, // Will be confirmed when they accept invite
        user_metadata: {
          is_placeholder: true,
          helper_email: normalizedEmail,
        },
      });

      if (createUserError || !placeholderUser) {
        logStep("ERROR: Failed to create placeholder user", { error: createUserError?.message });
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create helper account" } as InviteResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Placeholder user created in auth.users", { user_id: placeholderUser.id });
      
      // Now create team_members record
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          owner_id: user.id,
          helper_id: helperId,
          helper_email: normalizedEmail,
          helper_name: helperName || null,
          invite_token: inviteToken,
          invited_at: new Date().toISOString(),
          invite_expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        logStep("ERROR: Failed to create team member", { error: insertError.message });
        // Clean up: delete the placeholder user if team_members insert fails
        await supabase.auth.admin.deleteUser(helperId);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create helper invite" } as InviteResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Created new placeholder helper", { helperId });
    }

    // 6. Get owner's business name for email personalization
    const { data: ownerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('business_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("WARNING: Failed to get owner profile", { error: profileError.message });
    }

    const ownerName = ownerProfile?.business_name || 'Your team';
    logStep("Owner name retrieved", { ownerName });

    // 7. Generate invite URL
    // Use APP_URL env var if set, otherwise construct from request
    const appUrl = Deno.env.get("APP_URL") || 
                   Deno.env.get("VITE_APP_URL") || 
                   "https://solowipe.co.uk"; // Fallback to production URL
    
    const inviteUrl = `${appUrl}/auth?token=${inviteToken}`;
    logStep("Invite URL generated", { url: inviteUrl.substring(0, 50) + '...' });

    // 8. Send invite email via send-email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      headers: {
        Authorization: authHeader || '', // Pass the authorization header from original request
      },
      body: {
        to: normalizedEmail,
        subject: `You've been invited to join ${ownerName} on SoloWipe`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>You've been invited!</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">You've been invited!</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; margin-top: 0;">
                  <strong>${ownerName}</strong> has invited you to join their team on SoloWipe.
                </p>
                <p style="font-size: 16px;">
                  SoloWipe helps window cleaning businesses manage jobs, routes, and payments. As a helper, you'll be able to see your assigned jobs and mark them complete.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
                <p style="font-size: 14px; color: #666; margin-bottom: 0;">
                  This invitation link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `${ownerName} has invited you to join their team on SoloWipe.\n\nClick this link to accept: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
      },
    });

    if (emailError) {
      logStep("ERROR: Email send failed", { error: emailError.message });
      // Don't fail the invite - token is created, user can share link manually
      // But log prominently
      console.error('[INVITE-HELPER] CRITICAL: Email send failed but invite token created:', {
        inviteToken,
        inviteUrl,
        error: emailError,
      });
    } else {
      logStep("Email sent successfully", { messageId: emailResult?.messageId });
    }

    // 9. Return success response
    logStep("Invite created successfully", { helperId, email: normalizedEmail });

    return new Response(
      JSON.stringify({
        success: true,
        inviteToken,
        inviteUrl,
        helperId,
      } as InviteResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR: Unexpected error", { error: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error" 
      } as InviteResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

