import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseInitError, supabase } from '@/integrations/supabase/client';

import { Provider } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabaseError: Error | null;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    businessName: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);

  useEffect(() => {
    // If Supabase isn't configured correctly, do NOT attempt to call it from an effect.
    // Errors thrown in effects are not caught by ErrorBoundary and can leave the app unusable.
    const initError = getSupabaseInitError();
    if (initError) {
      console.error('[AuthProvider] Supabase configuration error:', initError);
      setSupabaseError(initError);
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        // Handle OAuth sign-up - ensure profile exists and has business_name
        if (event === 'SIGNED_IN' && nextSession?.user) {
          // Check if this is a Google OAuth user
          const isOAuthUser = nextSession.user.app_metadata?.provider === 'google';

          if (isOAuthUser) {
            // Small delay to ensure profile trigger has completed
            setTimeout(async () => {
              try {
                // Verify profile exists and check business_name
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('business_name')
                  .eq('id', nextSession.user.id)
                  .maybeSingle();

                // If profile exists but business_name is default, mark for update
                if (!error && profile && profile.business_name === 'My Window Cleaning') {
                  // Store flag to show business name collection modal
                  sessionStorage.setItem('needs_business_name', 'true');
                  // Trigger a custom event to notify components
                  window.dispatchEvent(new Event('needs-business-name'));
                }
              } catch (err) {
                console.error('Error checking profile after OAuth:', err);
              }
            }, 500);
          }
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

      subscription = sub;

      // THEN check for existing session and validate it
      supabase.auth
        .getSession()
        .then(async ({ data: { session: existingSession } }) => {
          try {
            if (existingSession?.user) {
              // Validate that the user's profile still exists
              const { error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', existingSession.user.id)
                .single();

              if (error) {
                // Profile doesn't exist - user was deleted, force sign out
                console.warn('Session invalid: profile not found, signing out');
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
              }
            }

            setSession(existingSession);
            setUser(existingSession?.user ?? null);
            setLoading(false);
          } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to load session');
            console.error('[AuthProvider] Failed to check session:', e);
            setSupabaseError(e);
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        })
        .catch((err) => {
          const e = err instanceof Error ? err : new Error('Failed to load session');
          console.error('[AuthProvider] getSession failed:', e);
          setSupabaseError(e);
          setSession(null);
          setUser(null);
          setLoading(false);
        });
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to initialize auth');
      console.error('[AuthProvider] Failed to initialize Supabase auth:', e);
      setSupabaseError(e);
      setSession(null);
      setUser(null);
      setLoading(false);
    }

    // Handle "remember me" - clear session on browser close if not checked
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('clearSessionOnClose') === 'true') {
        try {
          supabase.auth.signOut();
        } catch (err) {
          console.warn('[AuthProvider] signOut failed during unload:', err);
        }
        sessionStorage.removeItem('clearSessionOnClose');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (supabaseError) return { error: supabaseError };
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign in failed') };
    }
  };

  const signUp = async (email: string, password: string, businessName: string) => {
    if (supabaseError) return { error: supabaseError, needsEmailConfirmation: false };
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            business_name: businessName,
          },
        },
      });
      // If email confirmations are enabled, Supabase returns no session.
      // Treat that as a successful signup that still needs verification.
      const needsEmailConfirmation = !data.session;
      return { error: error ? new Error(error.message) : null, needsEmailConfirmation };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Sign up failed'),
        needsEmailConfirmation: false,
      };
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    if (supabaseError) return { error: supabaseError };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('OAuth sign-in failed') };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    if (supabaseError) return { error: supabaseError };
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to resend verification email') };
    }
  };

  const signOut = async () => {
    if (supabaseError) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      supabaseError,
      isSupabaseConfigured: !supabaseError,
      signIn,
      signUp,
      signInWithOAuth,
      resendVerificationEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
