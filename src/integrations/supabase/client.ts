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

// Create a placeholder client that logs errors but doesn't crash
// This allows the app to render even if Supabase isn't configured
function createPlaceholderClient(): SupabaseClient {
  const errorResponse = { data: null, error: { message: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.' } };
  const emptyArrayResponse = { data: [], error: null };
  
  // Create a chainable query builder that always returns empty/error
  const createQueryBuilder = () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve(errorResponse),
        maybeSingle: () => Promise.resolve(errorResponse),
        limit: () => Promise.resolve(emptyArrayResponse),
        order: () => Promise.resolve(emptyArrayResponse),
        then: (onResolve: any) => Promise.resolve(emptyArrayResponse).then(onResolve),
      }),
      limit: () => Promise.resolve(emptyArrayResponse),
      order: () => Promise.resolve(emptyArrayResponse),
      then: (onResolve: any) => Promise.resolve(emptyArrayResponse).then(onResolve),
    }),
    insert: () => ({
      select: () => Promise.resolve(errorResponse),
      then: (onResolve: any) => Promise.resolve(errorResponse).then(onResolve),
    }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve(errorResponse),
        then: (onResolve: any) => Promise.resolve(errorResponse).then(onResolve),
      }),
      select: () => Promise.resolve(errorResponse),
      then: (onResolve: any) => Promise.resolve(errorResponse).then(onResolve),
    }),
    upsert: () => ({
      select: () => Promise.resolve(errorResponse),
      then: (onResolve: any) => Promise.resolve(errorResponse).then(onResolve),
    }),
    delete: () => ({
      eq: () => Promise.resolve(errorResponse),
      then: (onResolve: any) => Promise.resolve(errorResponse).then(onResolve),
    }),
    then: (onResolve: any) => Promise.resolve(emptyArrayResponse).then(onResolve),
  });
  
  const placeholder = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {},
            id: 'placeholder'
          } 
        } 
      }),
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signInWithOAuth: () => Promise.resolve({ data: { provider: null, url: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: createQueryBuilder,
    functions: {
      invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    },
  } as unknown as SupabaseClient;
  
  return placeholder;
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!cachedInitError) {
    cachedInitError = validateSupabaseConfig(SUPABASE_URL, SUPABASE_KEY);
    if (!cachedInitError) {
      try {
        cachedClient = createClient(SUPABASE_URL as string, SUPABASE_KEY as string);
        console.log('[supabase] Client initialized successfully');
      } catch (e) {
        cachedInitError =
          e instanceof Error ? e : new Error('Failed to initialize Supabase client.');
        console.error('[supabase] Client creation failed:', cachedInitError);
      }
    } else {
      console.error('[supabase] Configuration error:', cachedInitError);
    }
  }

  if (cachedClient) return cachedClient;

  // Instead of throwing, return a placeholder client that allows app to render
  // This prevents white screen errors in production
  console.warn('[supabase] Using placeholder client - Supabase not configured. App will render but features requiring Supabase will not work.');
  console.warn('[supabase] Error:', cachedInitError?.message || 'Unknown error');
  console.warn('[supabase] Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your environment variables.');
  
  // Create and cache placeholder client
  if (!cachedClient) {
    cachedClient = createPlaceholderClient();
  }
  
  return cachedClient;
}

/**
 * Backwards-compatible export used across the codebase.
 * This proxy delays initialization until the first property access.
 * Never throws - always returns a client (real or placeholder).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    // Always get client lazily - getSupabaseClient never throws, returns placeholder if needed
    const client = getSupabaseClient();
    // Use Reflect.get to avoid `any` while still deferring initialization.
    return Reflect.get(
      client as unknown as Record<PropertyKey, unknown>,
      prop
    );
  },
}) as SupabaseClient;

export function getSupabaseInitError(): Error | null {
  if (cachedClient) return null;
  if (!cachedInitError) cachedInitError = validateSupabaseConfig(SUPABASE_URL, SUPABASE_KEY);
  return cachedInitError;
}
