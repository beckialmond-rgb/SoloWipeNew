import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("ERROR: RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY environment variable is not set" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const body: SendEmailRequest = await req.json();
    const { to, subject, html, text, from, replyTo } = body;

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: 'to' and 'subject' are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Sending email", { to, subject });

    // Import Resend (using esm.sh for Deno compatibility, same pattern as other edge functions)
    const { Resend } = await import("https://esm.sh/resend@4.0.0");
    const resend = new Resend(resendApiKey);

    const result = await resend.emails.send({
      from: from || "Solowipe Team <noreply@solowipe.co.uk>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    });

    if (result.error) {
      logStep("ERROR: Resend API error", { error: result.error });
      return new Response(
        JSON.stringify({ error: result.error.message || "Failed to send email" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    logStep("Email sent successfully", { messageId: result.data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

