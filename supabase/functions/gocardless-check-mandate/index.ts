import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders } from "../_shared/cors.ts";

// Encryption key derived from a secret - matches gocardless-callback
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('SERVICE_ROLE_KEY environment variable is required for encryption');
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret.slice(0, 32).padEnd(32, '0')),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('gocardless-token-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();
    
    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    // Fallback for legacy Base64 encoded tokens (migration support)
    console.log('[GC-CHECK] Attempting legacy token decryption');
    try {
      const decoded = atob(encrypted);
      if (decoded.startsWith('gc_token_')) {
        return decoded.replace('gc_token_', '');
      }
    } catch {
      // Not a legacy token either
    }
    throw new Error('Failed to decrypt token');
  }
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { customerId } = body;

    // Validate inputs
    if (!customerId || !isValidUUID(customerId)) {
      return new Response(JSON.stringify({ error: 'Invalid customer ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user's GoCardless credentials and customer's mandate info
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gocardless_access_token_encrypted) {
      return new Response(JSON.stringify({ error: 'GoCardless not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('gocardless_id, gocardless_mandate_status, name')
      .eq('id', customerId)
      .eq('profile_id', user.id)
      .single();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customer.gocardless_id) {
      return new Response(JSON.stringify({ 
        error: 'Customer does not have a Direct Debit mandate',
        currentStatus: customer.gocardless_mandate_status || null,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    const apiUrl = environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

    console.log('[GC-CHECK] Checking mandate status for customer:', customer.name);
    console.log('[GC-CHECK] Current gocardless_id:', customer.gocardless_id);
    console.log('[GC-CHECK] Current status in DB:', customer.gocardless_mandate_status);

    // Check if gocardless_id is a billing request ID (starts with 'br_')
    // If so, we can't check it directly - need to wait for webhook
    if (customer.gocardless_id.startsWith('br_')) {
      console.log('[GC-CHECK] Customer has billing request ID, not mandate ID yet');
      return new Response(JSON.stringify({ 
        status: 'pending',
        message: 'Mandate setup in progress. Waiting for customer to complete authorization.',
        gocardless_id: customer.gocardless_id,
        currentStatus: customer.gocardless_mandate_status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query GoCardless API to get current mandate status
    console.log('[GC-CHECK] Querying GoCardless API for mandate:', customer.gocardless_id);
    const mandateResponse = await fetch(`${apiUrl}/mandates/${customer.gocardless_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
      },
    });

    if (!mandateResponse.ok) {
      const errorText = await mandateResponse.text();
      console.error('[GC-CHECK] Failed to fetch mandate:', mandateResponse.status, errorText);
      
      // If mandate not found, it might have been cancelled or expired
      if (mandateResponse.status === 404) {
        // SECURITY: Validate ownership before update
        // Update customer to reflect mandate no longer exists
        await adminClient
          .from('customers')
          .update({
            gocardless_id: null,
            gocardless_mandate_status: 'expired',
          })
          .eq('id', customerId)
          .eq('profile_id', user.id); // CRITICAL: Ensure customer belongs to user

        return new Response(JSON.stringify({ 
          status: 'expired',
          message: 'Mandate not found in GoCardless. It may have been cancelled or expired.',
          updated: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Failed to check mandate status',
        details: errorText,
      }), {
        status: mandateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mandateData = await mandateResponse.json();
    const mandate = mandateData.mandates;
    const mandateStatus = mandate.status; // 'pending_customer_approval', 'active', 'cancelled', 'expired', 'failed'

    console.log('[GC-CHECK] Mandate status from GoCardless:', mandateStatus);

    // Map GoCardless status to our status
    let mappedStatus: string;
    switch (mandateStatus) {
      case 'pending_customer_approval':
        mappedStatus = 'pending';
        break;
      case 'active':
        mappedStatus = 'active';
        break;
      case 'cancelled':
        mappedStatus = 'cancelled';
        break;
      case 'expired':
        mappedStatus = 'expired';
        break;
      case 'failed':
        mappedStatus = 'failed';
        break;
      default:
        mappedStatus = mandateStatus;
    }

    // Update customer record if status has changed
    let updated = false;
    if (customer.gocardless_mandate_status !== mappedStatus) {
      console.log('[GC-CHECK] Status changed:', customer.gocardless_mandate_status, '→', mappedStatus);
      
      const updateData: Record<string, unknown> = {
        gocardless_mandate_status: mappedStatus,
      };

      // If mandate is cancelled/expired/failed, clear the mandate ID
      if (['cancelled', 'expired', 'failed'].includes(mappedStatus)) {
        updateData.gocardless_id = null;
      }

      // SECURITY: Validate ownership before update
      const { error: updateError } = await adminClient
        .from('customers')
        .update(updateData)
        .eq('id', customerId)
        .eq('profile_id', user.id); // CRITICAL: Ensure customer belongs to user

      if (updateError) {
        console.error('[GC-CHECK] Failed to update customer:', updateError);
      } else {
        updated = true;
        console.log('[GC-CHECK] Customer record updated successfully');
      }
    } else {
      console.log('[GC-CHECK] Status unchanged:', mappedStatus);
    }

    return new Response(JSON.stringify({ 
      status: mappedStatus,
      gocardlessStatus: mandateStatus,
      gocardless_id: customer.gocardless_id,
      updated,
      message: updated 
        ? `Status updated from '${customer.gocardless_mandate_status}' to '${mappedStatus}'`
        : `Status is already '${mappedStatus}'`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('❌ CRITICAL GOCARDLESS ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

