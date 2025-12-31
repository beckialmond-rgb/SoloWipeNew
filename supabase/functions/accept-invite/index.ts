import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACCEPT-INVITE] ${step}${detailsStr}`);
};

interface AcceptInviteRequest {
  invite_token: string;
  password: string;
}

interface AcceptInviteResponse {
  success: boolean;
  helper_id?: string;
  email?: string;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." } as AcceptInviteResponse),
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
        JSON.stringify({ success: false, error: "Server configuration error" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      logStep("ERROR: Invalid JSON", { error: String(error) });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { invite_token, password }: AcceptInviteRequest = body as AcceptInviteRequest;
    
    if (!invite_token || typeof invite_token !== 'string' || !invite_token.trim()) {
      logStep("ERROR: Invalid invite_token");
      return new Response(
        JSON.stringify({ success: false, error: "Valid invite_token required" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      logStep("ERROR: Invalid password");
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 8 characters" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Validating invite token", { token: invite_token.substring(0, 8) + '...' });

    // 2. Validate invite token and get helper_id
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('id, helper_id, helper_email, invite_expires_at, invite_accepted_at, owner_id')
      .eq('invite_token', invite_token.trim())
      .maybeSingle();

    if (teamMemberError) {
      logStep("ERROR: Failed to query team_members", { error: teamMemberError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to validate invite" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!teamMember) {
      logStep("ERROR: Invite token not found");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired invitation token" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check if already accepted
    if (teamMember.invite_accepted_at) {
      logStep("ERROR: Invite already accepted", { helper_id: teamMember.helper_id });
      return new Response(
        JSON.stringify({ success: false, error: "This invitation has already been accepted" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if expired
    if (teamMember.invite_expires_at && new Date(teamMember.invite_expires_at) < new Date()) {
      logStep("ERROR: Invite expired", { expires_at: teamMember.invite_expires_at });
      return new Response(
        JSON.stringify({ success: false, error: "This invitation has expired" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const helperId = teamMember.helper_id;
    const helperEmail = teamMember.helper_email;

    logStep("Invite validated", { helper_id: helperId, email: helperEmail });

    // 3. Verify the placeholder user exists in auth.users
    const { data: { user: existingUser }, error: userError } = await supabase.auth.admin.getUserById(helperId);

    if (userError || !existingUser) {
      logStep("ERROR: Placeholder user not found", { helper_id: helperId, error: userError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "User account not found. Please contact support." } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Verify email matches
    if (existingUser.email?.toLowerCase() !== helperEmail.toLowerCase()) {
      logStep("ERROR: Email mismatch", { 
        user_email: existingUser.email, 
        invite_email: helperEmail 
      });
      return new Response(
        JSON.stringify({ success: false, error: "Email mismatch. Please use the email address from the invitation." } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Updating user password and confirming email", { helper_id: helperId });

    // 4. Update user password and confirm email using admin API
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      helperId,
      {
        password: password,
        email_confirm: true, // Confirm email
      }
    );

    if (updateError || !updatedUser) {
      logStep("ERROR: Failed to update user", { error: updateError?.message });
      return new Response(
        JSON.stringify({ success: false, error: updateError?.message || "Failed to activate account" } as AcceptInviteResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    logStep("User updated successfully", { helper_id: helperId });

    // 4.5. Ensure profile exists (trigger might not have fired for admin-created user)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', helperId)
      .maybeSingle();

    if (!existingProfile) {
      logStep("Profile missing, creating it", { helper_id: helperId });
      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert({
          id: helperId,
          business_name: 'Helper Account', // Default name for helpers
        });

      if (profileCreateError) {
        logStep("WARNING: Failed to create profile", { error: profileCreateError.message });
        // Don't fail - profile might be created by trigger, continue
      } else {
        logStep("Profile created successfully", { helper_id: helperId });
      }
    } else {
      logStep("Profile already exists", { helper_id: helperId });
    }

    // 5. Update team_members to mark invite as accepted
    const { error: updateTeamMemberError } = await supabase
      .from('team_members')
      .update({
        invite_accepted_at: new Date().toISOString(),
      })
      .eq('id', teamMember.id);

    if (updateTeamMemberError) {
      logStep("ERROR: Failed to update team_members", { error: updateTeamMemberError.message });
      // Don't fail - user is activated, just log the error
      console.error('[ACCEPT-INVITE] Failed to update invite_accepted_at:', updateTeamMemberError);
    } else {
      logStep("Team member updated", { team_member_id: teamMember.id });
    }

    // 6. Activate billing for this helper (if needed)
    try {
      const { data: billingResult, error: billingError } = await supabase.functions.invoke(
        'manage-helper-billing',
        {
          body: {
            action: 'activate',
            helper_id: teamMember.id, // team_members.id, not helper_id column
          },
        }
      );
      
      if (billingError || !billingResult?.success) {
        logStep("WARNING: Billing activation failed", { 
          error: billingError?.message || billingResult?.error 
        });
        // Non-critical - billing can be activated later
      } else {
        logStep("Billing activated", { subscriptionItemId: billingResult.subscription_item_id });
      }
    } catch (billingErr) {
      logStep("WARNING: Exception activating billing", { error: String(billingErr) });
      // Non-critical - user is activated
    }

    logStep("Invite accepted successfully", { helper_id: helperId, email: helperEmail });

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        helper_id: helperId,
        email: helperEmail,
      } as AcceptInviteResponse),
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
      } as AcceptInviteResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

