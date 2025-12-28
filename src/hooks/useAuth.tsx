import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseInitError, supabase } from '@/integrations/supabase/client';
import { DEFAULT_BUSINESS_NAME } from '@/constants/app';

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
    businessName?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  checkEmailExists: (email: string) => Promise<{ exists: boolean; isHelper?: boolean; isPlaceholder?: boolean; ownerName?: string }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
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
        // Log auth state changes for debugging
        console.log('[Auth State Change]', {
          event,
          hasSession: !!nextSession,
          hasUser: !!nextSession?.user,
          userId: nextSession?.user?.id,
          provider: nextSession?.user?.app_metadata?.provider,
        });
        
        // Handle new signups - match placeholder helpers and check business name
        if (event === 'SIGNED_IN' && nextSession?.user) {
          const userEmail = nextSession.user.email;
          const userId = nextSession.user.id;
          
          // Small delay to ensure profile trigger has completed
          setTimeout(async () => {
            try {
              // 1. Check if this user should be matched to a placeholder helper
              if (userEmail) {
                // PRIORITY 1: Check for exact email match in team_members (most reliable)
                // This happens when owner provided the helper's real email
                const { data: exactMatch } = await supabase
                  .from('team_members')
                  .select('id, helper_id, helper_email, helper_name, owner_id')
                  .eq('helper_email', userEmail.toLowerCase())
                  .maybeSingle();

                // PRIORITY 2: Check for placeholder match (name matches email prefix)
                // This is a fallback for when owner only provided a name
                const emailPrefix = userEmail.split('@')[0].toLowerCase();
                const { data: placeholderMatch } = await supabase
                  .from('team_members')
                  .select('id, helper_id, helper_email, helper_name, owner_id')
                  .ilike('helper_email', `${emailPrefix}@temp.helper`)
                  .maybeSingle();

                // Prioritize exact email match over placeholder match
                const match = exactMatch || placeholderMatch;
                
                // Match if:
                // 1. Match found AND helper_id is different from current user ID
                // 2. helper_id is a placeholder (doesn't exist in auth.users) OR matches placeholder pattern
                if (match && match.helper_id !== userId) {
                  // Additional check: verify helper_id is actually a placeholder
                  // Check if helper_id exists in auth.users by trying to query profiles
                  // If profile doesn't exist, it's likely a placeholder
                  const { data: profileCheck } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', match.helper_id)
                    .maybeSingle();
                  
                  // If profile doesn't exist, this is definitely a placeholder
                  // OR if it's a temp email pattern, treat as placeholder
                  const isPlaceholder = !profileCheck || match.helper_email.endsWith('@temp.helper');
                  
                  if (isPlaceholder) {
                    console.log('[Helper Matching] Found placeholder match:', match);
                    
                    const { error: updateError } = await supabase
                      .from('team_members')
                      .update({
                        helper_id: userId,
                        helper_email: userEmail,
                      })
                      .eq('id', match.id);

                    if (!updateError) {
                      console.log('[Helper Matching] Successfully matched helper to user');
                      // Store flag to show celebration
                      sessionStorage.setItem('helper_matched', 'true');
                      if (match.owner_id) {
                        sessionStorage.setItem('helper_owner_id', match.owner_id);
                      }
                      // Get owner name from profiles for celebration message
                      if (match.owner_id) {
                        const { data: ownerProfile } = await supabase
                          .from('profiles')
                          .select('business_name')
                          .eq('id', match.owner_id)
                          .maybeSingle();
                        if (ownerProfile?.business_name) {
                          sessionStorage.setItem('helper_owner_name', ownerProfile.business_name);
                        }
                      }
                    } else {
                      console.error('[Helper Matching] Failed to update:', updateError);
                      // Store error for potential user notification
                      sessionStorage.setItem('helper_match_error', updateError.message);
                    }
                  } else {
                    // Real user with different ID - log but don't update (might be a different person)
                    console.warn('[Helper Matching] Found match but helper_id belongs to existing user - skipping update');
                  }
                }
              }

              // 2. Check if this is a Google OAuth user and needs business name
              const isOAuthUser = nextSession.user.app_metadata?.provider === 'google';

              if (isOAuthUser) {
                // Verify profile exists and check business_name
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('business_name')
                  .eq('id', userId)
                  .maybeSingle();

                // If profile exists but business_name is default, mark for update
                if (!error && profile && profile.business_name === DEFAULT_BUSINESS_NAME) {
                  // Store flag to show business name collection modal
                  sessionStorage.setItem('needs_business_name', 'true');
                  // Trigger a custom event to notify components
                  window.dispatchEvent(new Event('needs-business-name'));
                }
              }
            } catch (err) {
              console.error('Error checking profile after signin:', err);
            }
          }, 500);
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

      subscription = sub;

      // THEN check for existing session and validate it
      supabase.auth
        .getSession()
        .then(async ({ data: { session: existingSession }, error: sessionError }) => {
          try {
            // Only sign out if session is missing (AuthSessionMissing)
            if (sessionError) {
              const errorCode = sessionError.code || '';
              const errorMessage = sessionError.message?.toLowerCase() || '';
              
              // Only sign out on actual session missing errors
              if (errorCode === 'AuthSessionMissing' || 
                  errorMessage.includes('session missing') ||
                  errorMessage.includes('no session')) {
                console.warn('Session missing, signing out');
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
              }
              
              // Other errors - don't sign out, just log and continue
              console.error('[AuthProvider] Session error (non-critical):', sessionError);
            }

            if (existingSession?.user) {
              // Try to load profile, but don't sign out on failure
              // If profile fails to load, we'll just show generic "Welcome" instead
              const { error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', existingSession.user.id)
                .single();

              if (profileError) {
                // Profile load failed - log but don't sign out
                // The app will show generic "Welcome" instead of business name
                console.warn('[AuthProvider] Profile load failed (non-critical):', profileError);
                // Continue with session - user stays logged in
              }
            }

            setSession(existingSession);
            setUser(existingSession?.user ?? null);
            setLoading(false);
          } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to load session');
            console.error('[AuthProvider] Failed to check session:', e);
            setSupabaseError(e);
            // Don't sign out on errors - just set session to null and let user try again
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

  // Check if email exists and detect role (helper vs owner)
  // Note: We can't directly check auth.users from client, so we check team_members
  // and infer existence. Magic link will handle actual signup/signin.
  const checkEmailExists = async (email: string) => {
    if (supabaseError) return { exists: false };
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email exists in team_members as placeholder helper
      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('helper_email, helper_name, helper_id, owner_id')
        .eq('helper_email', normalizedEmail)
        .maybeSingle();

      // Also check for placeholder helpers with temp email pattern
      // e.g., if user types "john@email.com" but placeholder is "john@temp.helper"
      const emailPrefix = normalizedEmail.split('@')[0].toLowerCase();
      const { data: placeholderData } = await supabase
        .from('team_members')
        .select('helper_email, helper_name, helper_id, owner_id')
        .ilike('helper_email', `${emailPrefix}@temp.helper`)
        .maybeSingle();

      // Get owner name if helper found
      let ownerName: string | undefined;
      const helperData = teamMemberData || placeholderData;
      
      if (helperData?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', helperData.owner_id)
          .maybeSingle();
        ownerName = ownerProfile?.business_name;
      }

      const isHelper = !!helperData;
      
      // Check if helper is a placeholder (doesn't have a real profile)
      let isPlaceholder = false;
      if (isHelper && helperData.helper_id) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', helperData.helper_id)
          .maybeSingle();
        isPlaceholder = !profileCheck || helperData.helper_email.endsWith('@temp.helper');
      }
      
      // We can't definitively check if user exists in auth.users from client
      // Magic link will handle this - if user exists, it signs in; if not, it signs up
      return {
        exists: false, // Will be determined by magic link response
        isHelper,
        isPlaceholder: isHelper ? isPlaceholder : undefined,
        ownerName: isHelper ? ownerName : undefined,
      };
    } catch (err) {
      console.error('[checkEmailExists] Error:', err);
      return { exists: false };
    }
  };

  // Magic link authentication (email-first, passwordless)
  const signInWithMagicLink = async (email: string) => {
    if (supabaseError) return { error: supabaseError, isNewUser: false };
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      // Note: We can't reliably determine if user is new from client-side
      // Supabase will handle signup vs signin automatically with shouldCreateUser: true
      // We'll set isNewUser based on whether they have a profile after signin
      const isNewUser = false; // Will be determined after signin

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true, // Allow signup via magic link
        },
      });

      if (error) {
        return { error: new Error(error.message), isNewUser: false };
      }

      return { error: null, isNewUser: false }; // Will be updated after signin
    } catch (err) {
      return { 
        error: err instanceof Error ? err : new Error('Failed to send magic link'),
        isNewUser: false,
      };
    }
  };

  const signUp = async (email: string, password: string, businessName?: string) => {
    if (supabaseError) return { error: supabaseError, needsEmailConfirmation: false };
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    try {
      console.log('[SignUp] Attempting signup for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            // Only include business_name if provided (optional)
            ...(businessName ? { business_name: businessName } : {}),
          },
        },
      });
      
      if (error) {
        console.error('[SignUp] Supabase signup error:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        return { error: new Error(error.message), needsEmailConfirmation: false };
      }
      
      console.log('[SignUp] Signup successful:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
      });
      
      // If email confirmations are enabled, Supabase returns no session.
      // Treat that as a successful signup that still needs verification.
      const needsEmailConfirmation = !data.session;
      
      // If we have a session, verify profile was created (with a small delay for trigger)
      if (data.session && data.user) {
        setTimeout(async () => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, business_name')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (profileError) {
              console.error('[SignUp] Profile check error:', profileError);
            } else if (!profile) {
              console.warn('[SignUp] Profile not found after signup - trigger may have failed');
            } else {
              console.log('[SignUp] Profile created successfully:', profile.business_name);
            }
          } catch (err) {
            console.error('[SignUp] Error checking profile:', err);
          }
        }, 1000);
      }
      
      return { error: null, needsEmailConfirmation };
    } catch (err) {
      console.error('[SignUp] Unexpected error during signup:', err);
      return {
        error: err instanceof Error ? err : new Error('Sign up failed'),
        needsEmailConfirmation: false,
      };
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    if (supabaseError) return { error: supabaseError };
    try {
      // Construct redirect URL - redirect authenticated users directly to dashboard
      const origin = window.location.origin;
      const redirectTo = `${origin}/dashboard`;
      
      console.log('[OAuth] Initiating sign-in with provider:', provider);
      console.log('[OAuth] Current origin:', origin);
      console.log('[OAuth] Redirect URL:', redirectTo);
      console.log('[OAuth] ⚠️ Make sure this redirect URL is registered in Supabase Dashboard → Authentication → URL Configuration');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // Google OAuth query parameters for optimal UX
          // - prompt: 'select_account' shows account selection without forcing consent screen
          // - This provides better UX for returning users while still allowing account switching
          ...(provider === 'google' ? {
            queryParams: {
              prompt: 'select_account',
              // access_type: 'offline' only needed if we use refresh tokens
              // Supabase handles token management, so we don't need to explicitly request offline access
            },
          } : {}),
        },
      });
      
      if (error) {
        console.error('[OAuth] Sign-in error:', error);
        return { error: new Error(error.message) };
      }
      
      // If we get a URL back, Supabase will redirect automatically
      // The session will be handled by the auth state listener
      if (data?.url) {
        console.log('[OAuth] Redirecting to OAuth provider...');
        // Supabase will handle the redirect automatically
      }
      
      return { error: null };
    } catch (err) {
      console.error('[OAuth] Unexpected error:', err);
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
      // Await Supabase sign-out
      await supabase.auth.signOut();
      
      // Manually clear localStorage to ensure session is gone
      window.localStorage.clear();
      
      // Force a hard page refresh to the login screen
      window.location.assign('/auth');
    } catch (err) {
      console.error('Sign out failed:', err);
      // Even if signOut fails, clear storage and redirect
      window.localStorage.clear();
      window.location.assign('/auth');
    }
  };

  const deleteAccount = async () => {
    if (supabaseError) return { error: supabaseError };
    if (!user?.id) return { error: new Error('No user logged in') };

    try {
      console.log('[deleteAccount] Starting account deletion process...');

      // Call edge function to handle all cleanup and deletion
      // The edge function will:
      // 1. Cancel Stripe subscription (if active)
      // 2. Disconnect GoCardless (if connected)
      // 3. Delete storage files (job photos)
      // 4. Delete the auth user (cascades to profiles, customers, jobs)
      const { data: functionData, error: functionError } = await supabase.functions.invoke('delete-account');

      if (functionError) {
        console.error('[deleteAccount] Failed to delete account:', functionError);
        return { error: new Error(functionError.message || 'Failed to delete account. Please contact support.') };
      }

      if (functionData?.error) {
        console.error('[deleteAccount] Edge function returned error:', functionData.error);
        return { error: new Error(functionData.error || 'Failed to delete account') };
      }

      console.log('[deleteAccount] Account deleted successfully');

      // Clear all local storage
      window.localStorage.clear();
      window.sessionStorage.clear();

      // Redirect to auth page
      window.location.assign('/auth?deleted=true');

      return { error: null };
    } catch (err) {
      console.error('[deleteAccount] Unexpected error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete account') };
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
      signInWithMagicLink,
      checkEmailExists,
      signInWithOAuth,
      resendVerificationEmail,
      signOut,
      deleteAccount,
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
