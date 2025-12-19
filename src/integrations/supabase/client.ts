import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * IMPORTANT:
 * - Never throw at module import time (prevents React from mounting → “white screen”).
 * - Validate env vars and throw only when Supabase is actually used.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Prefer anon key (legacy JWT) but allow publishable key (new format) for compatibility.
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

let cachedClient: SupabaseClient | null = null;
let cachedInitError: Error | null = null;

function validateSupabaseConfig(url?: string, key?: string): Error | null {
  if (!url || !key) {
    return new Error(
      'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).'
    );
  }

  // Keep validation intentionally lightweight but helpful.
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    return new Error(
      `Invalid VITE_SUPABASE_URL. Expected something like "https://<project>.supabase.co", got: ${url}`
    );
  }

  // Accept:
  // - Legacy anon JWTs: eyJ...
  // - New publishable keys: sb_publishable_...
  // (We intentionally do NOT accept service role / secret keys here.)
  if (!(key.startsWith('eyJ') || key.startsWith('sb_publishable_'))) {
    return new Error(
      'Invalid Supabase key. Expected an anon JWT (eyJ...) or a publishable key (sb_publishable_...).'
    );
  }

  return null;
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!cachedInitError) {
    cachedInitError = validateSupabaseConfig(SUPABASE_URL, SUPABASE_KEY);
    if (!cachedInitError) {
      try {
        cachedClient = createClient(SUPABASE_URL as string, SUPABASE_KEY as string);
      } catch (e) {
        cachedInitError =
          e instanceof Error ? e : new Error('Failed to initialize Supabase client.');
      }
    }
  }

  if (cachedClient) return cachedClient;

  // Ensure we always throw a real Error with a useful message.
  const err =
    cachedInitError ??
    new Error('Failed to initialize Supabase client (unknown error).');
  console.error('[supabase] initialization error:', err);
  throw err;
}

/**
 * Backwards-compatible export used across the codebase.
 * This proxy delays initialization until the first property access.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    // Use Reflect.get to avoid `any` while still deferring initialization.
    return Reflect.get(
      getSupabaseClient() as unknown as Record<PropertyKey, unknown>,
      prop
    );
  },
}) as SupabaseClient;

export function getSupabaseInitError(): Error | null {
  if (cachedClient) return null;
  if (!cachedInitError) cachedInitError = validateSupabaseConfig(SUPABASE_URL, SUPABASE_KEY);
  return cachedInitError;
}
