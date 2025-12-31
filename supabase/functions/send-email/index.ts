import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Production-ready email sending edge function
 * Accepts { to, subject, html } and sends via Resend API
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

/**
 * Type-safe email request interface
 */
interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string; // Required - must provide HTML content
  text?: string; // Optional plain text fallback
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Type-safe email response interface
 */
interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email request payload
 */
function validateRequest(body: unknown): { valid: boolean; error?: string; data?: SendEmailRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  // Validate 'to' field
  if (!req.to) {
    return { valid: false, error: "Missing required field: 'to'" };
  }

  const toEmails = Array.isArray(req.to) ? req.to : [req.to];
  for (const email of toEmails) {
    if (typeof email !== 'string' || !isValidEmail(email)) {
      return { valid: false, error: `Invalid email address: ${email}` };
    }
  }

  // Validate 'subject' field
  if (!req.subject || typeof req.subject !== 'string' || req.subject.trim().length === 0) {
    return { valid: false, error: "Missing or invalid required field: 'subject'" };
  }

  // Validate 'html' field
  if (!req.html || typeof req.html !== 'string' || req.html.trim().length === 0) {
    return { valid: false, error: "Missing or invalid required field: 'html'" };
  }

  // Optional fields validation
  if (req.text !== undefined && typeof req.text !== 'string') {
    return { valid: false, error: "Invalid field: 'text' must be a string" };
  }

  if (req.from !== undefined && typeof req.from !== 'string') {
    return { valid: false, error: "Invalid field: 'from' must be a string" };
  }

  if (req.replyTo !== undefined && typeof req.replyTo !== 'string') {
    return { valid: false, error: "Invalid field: 'replyTo' must be a string" };
  }

  return {
    valid: true,
    data: {
      to: req.to as string | string[],
      subject: req.subject.trim(),
      html: req.html.trim(),
      text: req.text ? String(req.text).trim() : undefined,
      from: req.from ? String(req.from).trim() : undefined,
      replyTo: req.replyTo ? String(req.replyTo).trim() : undefined,
      tags: req.tags as Array<{ name: string; value: string }> | undefined,
    },
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    logStep("Function started", { method: req.method });

    // Check for Resend API key
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

    // Validate authorization (required for security)
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

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      logStep("ERROR: Invalid JSON", { error: String(error) });
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      logStep("ERROR: Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error || "Invalid request" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { to, subject, html, text, from, replyTo, tags } = validation.data;

    // Log email attempt (without sensitive data)
    const toLog = Array.isArray(to) ? `${to.length} recipients` : to;
    logStep("Sending email", { to: toLog, subject });

    // Import Resend (using esm.sh for Deno compatibility)
    const { Resend } = await import("https://esm.sh/resend@4.0.0");
    const resend = new Resend(resendApiKey);

    // Send email via Resend
    const result = await resend.emails.send({
      from: from || "Solowipe Team <noreply@solowipe.co.uk>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || undefined,
      reply_to: replyTo || undefined,
      tags: tags || undefined,
    });

    // Handle Resend API errors
    if (result.error) {
      logStep("ERROR: Resend API error", { error: result.error });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error.message || "Failed to send email via Resend API" 
        } as SendEmailResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Success response
    logStep("Email sent successfully", { messageId: result.data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.data?.id,
      } as SendEmailResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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
      } as SendEmailResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

