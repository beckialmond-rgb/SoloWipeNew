import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { Provider } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle OAuth sign-up - ensure profile exists and has business_name
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is a Google OAuth user
          const isOAuthUser = session.user.app_metadata?.provider === 'google';
          
          if (isOAuthUser) {
            // Small delay to ensure profile trigger has completed
            setTimeout(async () => {
              try {
                // Verify profile exists and check business_name
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('business_name')
                  .eq('id', session.user.id)
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
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session and validate it
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Validate that the user's profile still exists
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
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
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle "remember me" - clear session on browser close if not checked
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('clearSessionOnClose') === 'true') {
        supabase.auth.signOut();
        sessionStorage.removeItem('clearSessionOnClose');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, businessName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
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
    return { error, needsEmailConfirmation };
  };

  const signInWithOAuth = async (provider: Provider) => {
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
    return { error };
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithOAuth, resendVerificationEmail, signOut }}>
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
