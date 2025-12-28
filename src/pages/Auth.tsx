import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Loader2, Mail, Lock, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useEmailValidation } from '@/hooks/useEmailValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { PasswordInput } from '@/components/PasswordInput';
import { EmailInput } from '@/components/EmailInput';
import { MagicLinkSent } from '@/components/MagicLinkSent';
import { cn } from '@/lib/utils';
import { RATE_LIMIT_COOLDOWN_MS } from '@/constants/app';
import { analytics } from '@/lib/analytics';
import { validateEmailWithSuggestions } from '@/utils/emailValidation';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? false : true;
  const [isLogin, setIsLogin] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const [showVerificationResend, setShowVerificationResend] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<Date | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // New states for email-first magic link flow
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [usePassword, setUsePassword] = useState(false); // Toggle between magic link and password
  const [emailContext, setEmailContext] = useState<{ isHelper?: boolean; isPlaceholder?: boolean; ownerName?: string; isNewUser?: boolean } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const passwordsMatch = password === confirmPassword;
  const { user, loading: authLoading, supabaseError, signIn, signUp, signInWithMagicLink, checkEmailExists, signInWithOAuth, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const businessNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  const passwordStrength = usePasswordStrength(password);
  const emailValidation = useEmailValidation(email);

  // Handle magic link callback (check for hash fragments from Supabase redirect)
  const magicLinkProcessedRef = useRef(false);
  
  useEffect(() => {
    if (authLoading || magicLinkProcessedRef.current) return; // Wait for auth to initialize and prevent re-processing
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    const type = hashParams.get('type'); // 'signup' or 'recovery'

    if (accessToken || error) {
      // Mark as processed immediately to prevent re-execution
      magicLinkProcessedRef.current = true;
      
      // Magic link callback detected - Supabase will handle auth state change
      // Just clean up URL and show appropriate message
      if (error) {
        toast({
          title: 'Magic link error',
          description: errorDescription || error || 'The magic link could not be processed. It may have expired or been used already. Please request a new one.',
          variant: 'destructive',
        });
        // Clean up URL
        window.history.replaceState({}, '', '/auth');
      } else if (accessToken) {
        // Success - auth state change will handle the redirect
        // Show success message briefly
        toast({
          title: type === 'signup' ? 'Welcome to SoloWipe!' : 'Welcome back!',
          description: 'You\'ve been signed in successfully.',
        });
        // Clean up URL
        window.history.replaceState({}, '', '/auth');
      }
    }
  }, [authLoading, toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Check for account deletion confirmation
  useEffect(() => {
    const deleted = searchParams.get('deleted');
    if (deleted === 'true' && !authLoading) {
      toast({
        title: 'Account deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });
      // Clean up URL parameters
      navigate('/auth', { replace: true });
    }
  }, [searchParams, authLoading, toast, navigate]);

  // Check for OAuth errors in URL parameters (e.g., from Google OAuth callback)
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Log OAuth callback for debugging
    if (error || searchParams.get('code')) {
      console.log('[OAuth Callback] URL params:', {
        error,
        errorDescription,
        hasCode: !!searchParams.get('code'),
        currentOrigin: window.location.origin,
        currentPath: window.location.pathname,
        fullURL: window.location.href,
      });
    }
    
    if (error && !authLoading) {
      let errorMessage = 'Authentication failed';
      let errorTitle = 'Sign in failed';
      
      // Handle specific OAuth error codes with user-friendly messages
      if (error === 'access_denied') {
        errorTitle = 'Sign in cancelled';
        errorMessage = 'You cancelled the Google sign-in. Please try again if you want to continue.';
      } else if (error === 'configuration_error') {
        errorTitle = 'Configuration error';
        errorMessage = 'Google sign-in is not properly configured. Please contact support if this issue persists.';
      } else if (error === 'redirect_uri_mismatch') {
        errorTitle = 'Configuration error';
        errorMessage = 'The redirect URL is not properly configured. Please contact support.';
      } else if (error === 'invalid_request') {
        errorTitle = 'Invalid request';
        errorMessage = errorDescription || 'The sign-in request was invalid. Please try again.';
      } else if (error === 'server_error') {
        errorTitle = 'Server error';
        errorMessage = 'Google sign-in is temporarily unavailable. Please try again in a moment.';
      } else if (error === 'temporarily_unavailable') {
        errorTitle = 'Service unavailable';
        errorMessage = 'Google sign-in is temporarily unavailable. Please try again in a moment.';
      } else if (errorDescription) {
        errorMessage = errorDescription;
      }
      
      // Track OAuth error
      analytics.track('oauth_signin_failed', {
        provider: 'google',
        error_code: error,
        error_description: errorDescription || errorMessage,
      });
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Clean up URL parameters after a short delay to allow toast to be seen
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 3000);
    }
  }, [searchParams, authLoading, toast, navigate]);

  // Check email context when email changes (for role detection)
  useEffect(() => {
    // Reset context when email is cleared
    if (!email) {
      setEmailContext(null);
      return;
    }

    const checkEmail = async () => {
      if (!emailValidation.isValid || checkingEmail) return;
      
      setCheckingEmail(true);
      try {
        const context = await checkEmailExists(email);
        setEmailContext({
          isHelper: context.isHelper,
          isPlaceholder: context.isPlaceholder,
          ownerName: context.ownerName,
        });
      } catch (err) {
        console.error('[Auth] Error checking email context:', err);
        setEmailContext(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    // Debounce email checking to avoid excessive API calls
    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, emailValidation.isValid]);

  // Auto-focus first input when form loads or mode changes
  // Also reset email verification state when switching modes to avoid stale state
  useEffect(() => {
    if (!authLoading && !user && !magicLinkSent) {
      if (isLogin) {
        emailRef.current?.focus();
      } else {
        emailRef.current?.focus(); // Focus email first (no business name)
        // Clear verification resend when switching to signup
        setShowVerificationResend(false);
      }
    }
  }, [isLogin, authLoading, user, magicLinkSent]);

  // Rate limit countdown
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  
  useEffect(() => {
    if (!rateLimitedUntil) {
      setRateLimitSeconds(0);
      return;
    }
    
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitedUntil.getTime() - Date.now()) / 1000));
      setRateLimitSeconds(remaining);
      if (remaining <= 0) {
        setRateLimitedUntil(null);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  // Handle magic link submission (email-first flow)
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading || !emailValidation.isValid) return;
    
    setLoading(true);
    
    try {
      const { error, isNewUser } = await signInWithMagicLink(email);
      
      if (error) {
        // Check for rate limiting
        if (error.message?.toLowerCase().includes('rate limit') || 
            error.message?.toLowerCase().includes('too many requests') ||
            error.message?.toLowerCase().includes('exceeded')) {
          setRateLimitedUntil(new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS));
          toast({
            title: 'Too many requests',
            description: 'Please wait a moment before requesting another magic link. This helps us prevent spam.',
            variant: 'destructive',
          });
          return;
        }

        // User-friendly error messages
        let errorTitle = 'Failed to send magic link';
        let errorDescription = error.message;

        if (error.message?.toLowerCase().includes('invalid email')) {
          errorTitle = 'Invalid email address';
          errorDescription = 'Please check your email address and try again. Make sure it includes an @ symbol and a domain (e.g., example.com).';
        } else if (error.message?.toLowerCase().includes('email not allowed')) {
          errorTitle = 'Email not allowed';
          errorDescription = 'This email address cannot be used. Please try a different email address.';
        } else if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
          errorTitle = 'Connection problem';
          errorDescription = 'Unable to connect to our servers. Please check your internet connection and try again.';
        } else if (error.message?.toLowerCase().includes('timeout')) {
          errorTitle = 'Request timed out';
          errorDescription = 'The request took too long. Please check your internet connection and try again.';
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: 'destructive',
        });
      } else {
        // Success! Show magic link sent screen
        setMagicLinkSent(true);
        // Update context with isNewUser (though it may be false initially)
        setEmailContext(prev => ({ 
          ...prev, 
          isNewUser: isNewUser || false 
        }));
        
        // Track analytics
        // Note: isNewUser may be false initially, but magic link handles both signup and signin
        analytics.track('magic_link_sent', {
          is_helper: emailContext?.isHelper || false,
          is_new_user: isNewUser || false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle password-based submission (fallback)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    // Validate form before submission
    if (!isLogin) {
      if (!emailValidation.isValid || passwordStrength.score < 3 || !passwordsMatch || !acceptedTerms) {
        // Track validation failure
        analytics.track('signup_failed', {
          reason: 'validation',
          email_invalid: !emailValidation.isValid,
          password_weak: passwordStrength.score < 3,
          passwords_mismatch: !passwordsMatch,
          terms_not_accepted: !acceptedTerms,
        });
        return;
      }
      // Track signup start
      analytics.track('signup_started', {
        method: 'password',
        has_business_name: !!businessName,
        password_strength: passwordStrength.strength,
      });
    } else {
      // Track login start
      analytics.track('login_started', { method: 'password' });
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Check if error is about email not confirmed
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setShowVerificationResend(true);
          }
          
          // Check for rate limiting
          if (error.message?.toLowerCase().includes('rate limit') || 
              error.message?.toLowerCase().includes('too many requests') ||
              error.message?.toLowerCase().includes('exceeded')) {
            setRateLimitedUntil(new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS));
          }
          
          // Track failed attempts
          setFailedAttempts(prev => prev + 1);
          
          // Track login failure
          analytics.track('login_failed', {
            reason: error.message,
            failed_attempts: failedAttempts + 1,
          });
          
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // Reset failed attempts and rate limiting on successful login
          setFailedAttempts(0);
          setRateLimitedUntil(null);
          setShowVerificationResend(false);
          
          // Track successful login
          analytics.track('login_completed');
          
          // Store remember me preference
          if (!rememberMe) {
            sessionStorage.setItem('clearSessionOnClose', 'true');
          } else {
            sessionStorage.removeItem('clearSessionOnClose');
          }
          navigate('/dashboard');
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password, businessName || undefined);
        if (error) {
          console.error('[SignUp] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
          
          // Check for rate limiting
          if (error.message?.toLowerCase().includes('rate limit') || 
              error.message?.toLowerCase().includes('too many requests') ||
              error.message?.toLowerCase().includes('exceeded')) {
            setRateLimitedUntil(new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS));
          }
          
          // User-friendly error messages
          let errorTitle = 'Sign up failed';
          let errorDescription = error.message || 'An unexpected error occurred';
          
          if (error.message?.toLowerCase().includes('email already registered') ||
              error.message?.toLowerCase().includes('user already registered')) {
            errorTitle = 'Email already in use';
            errorDescription = 'This email is already registered. Try signing in instead, or use the magic link option for passwordless access.';
          } else if (error.message?.toLowerCase().includes('invalid email')) {
            errorTitle = 'Invalid email address';
            errorDescription = 'Please check your email address. Make sure it includes an @ symbol and a valid domain (e.g., example.com).';
          } else if (error.message?.toLowerCase().includes('password') && 
                     (error.message?.toLowerCase().includes('weak') || 
                      error.message?.toLowerCase().includes('short') ||
                      error.message?.toLowerCase().includes('minimum'))) {
            errorTitle = 'Password too weak';
            errorDescription = 'Your password must be at least 8 characters long and include a mix of letters, numbers, and symbols.';
          } else if (error.message?.toLowerCase().includes('network') || 
                     error.message?.toLowerCase().includes('fetch')) {
            errorTitle = 'Connection problem';
            errorDescription = 'Unable to connect to our servers. Please check your internet connection and try again.';
          }
          
          // Track signup failure
          analytics.track('signup_failed', {
            reason: error.message,
            error_type: error.name,
          });
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: 'destructive',
          });
        } else {
          if (needsEmailConfirmation) {
            // Track email verification sent
            analytics.track('signup_email_verification_sent');
            analytics.track('signup_completed', {
              method: 'password',
              needs_verification: true,
            });
            
            toast({
              title: 'Check your email to verify',
              description: 'We sent you a verification link. After verifying, come back and sign in.',
            });
            setShowVerificationResend(true);
            setIsLogin(true);
          } else {
            // Track successful signup
            analytics.track('signup_completed', {
              method: 'password',
              needs_verification: false,
            });
            
            toast({
              title: 'Welcome to SoloWipe!',
              description: 'Your account has been created.',
            });
            // Add small delay to ensure profile is created by trigger
            setTimeout(() => {
              try {
                navigate('/dashboard');
              } catch (navError) {
                console.error('[SignUp] Navigation error:', navError);
                // Still navigate even if there's an error
                window.location.href = '/dashboard';
              }
            }, 500);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend magic link
  const handleResendMagicLink = async () => {
    setResendingEmail(true);
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Magic link sent',
          description: 'Check your email for the new link.',
        });
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      const { error } = await resendVerificationEmail(email);
      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Verification email sent',
          description: 'Please check your inbox and spam folder.',
        });
      }
    } finally {
      setResendingEmail(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Logo skeleton */}
            <div className="text-center mb-10">
              <div className="h-12 w-32 mx-auto mb-4 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-48 mx-auto mb-2 bg-muted rounded-lg animate-pulse" />
              <div className="h-5 w-56 mx-auto bg-muted rounded-lg animate-pulse" />
            </div>
            {/* Form skeleton */}
            <div className="space-y-4">
              <div className="h-14 w-full bg-muted rounded-xl animate-pulse" />
              <div className="h-14 w-full bg-muted rounded-xl animate-pulse" />
              <div className="h-14 w-full bg-primary/20 rounded-xl animate-pulse" />
            </div>
            <div className="mt-6 flex justify-center">
              <div className="h-5 w-48 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show magic link sent screen
  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <MagicLinkSent
            email={email}
            isNewUser={emailContext?.isNewUser}
            isHelper={emailContext?.isHelper}
            isPlaceholder={emailContext?.isPlaceholder}
            ownerName={emailContext?.ownerName}
            onBack={() => {
              setMagicLinkSent(false);
              setEmail('');
            }}
            onResend={handleResendMagicLink}
            resending={resendingEmail}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <img 
              src="/SoloLogo.jpg" 
              alt="SoloWipe" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? 'Sign in to manage your rounds' 
                : 'Start managing your window cleaning business'}
            </p>
            {/* Contextual helper message */}
            {emailContext?.isHelper && emailContext.ownerName && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <p className="text-sm text-foreground">
                  <span className="font-semibold">You're joining {emailContext.ownerName}'s team!</span>
                  {emailContext.isPlaceholder && (
                    <span className="block mt-1 text-xs text-muted-foreground">
                      Once you sign up, you'll automatically be linked to your assigned jobs.
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </div>

          {/* Supabase configuration error */}
          {supabaseError && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left">
              <p className="text-sm font-semibold text-destructive">Configuration required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                SoloWipe can’t connect to Supabase yet. Add the required environment variables and redeploy.
              </p>
              <p className="mt-3 text-xs font-mono text-destructive break-all">
                {supabaseError.message}
              </p>
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Expected variables:</div>
                <div className="mt-1 font-mono text-xs">
                  VITE_SUPABASE_URL<br />
                  VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form 
            onSubmit={usePassword ? handlePasswordSubmit : handleMagicLinkSubmit}
            className="space-y-4"
            aria-label={isLogin ? 'Sign in form' : 'Sign up form'}
            noValidate
          >
            {/* Email Input - Always First */}
            <div className="space-y-2">
              <EmailInput
                ref={emailRef}
                id={isLogin ? "login-email" : "signup-email"}
                name={isLogin ? "login-email" : "signup-email"}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                validation={emailValidation}
                showValidation={true}
                required
                autoComplete={isLogin ? "email" : "email"}
                aria-label="Email address"
                aria-required="true"
                aria-invalid={!emailValidation.isEmpty && !emailValidation.isValid}
                className="touch-target-lg" // Larger touch target for mobile
              />
              {/* Email typo suggestion */}
              {email && emailValidation.isValid && (() => {
                const suggestion = validateEmailWithSuggestions(email);
                if (suggestion.suggestions && suggestion.suggestions.length > 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 rounded-lg bg-warning/10 border border-warning/20"
                    >
                      <p className="text-xs text-foreground mb-1">
                        <span className="font-medium">Did you mean </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(suggestion.suggestions![0]);
                            emailRef.current?.focus();
                          }}
                          className="text-primary hover:underline font-semibold touch-target-sm"
                        >
                          {suggestion.suggestions[0]}
                        </button>
                        <span className="font-medium">?</span>
                      </p>
                    </motion.div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Password Fields - Only show if user chooses password */}
            {usePassword && (
              <>
                {!isLogin && (
                  <div className="relative">
                    <label htmlFor="business-name" className="sr-only">
                      Business Name (Optional)
                    </label>
                    <Building 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" 
                      aria-hidden="true"
                    />
                    <input
                      ref={businessNameRef}
                      id="business-name"
                      name="business-name"
                      type="text"
                      placeholder="Business Name (Optional)"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      autoComplete="organization"
                      aria-label="Business name"
                      className={cn(
                        "w-full h-14 pl-12 pr-4 rounded-xl",
                        "bg-muted border-0",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary"
                      )}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <PasswordInput
                    id={isLogin ? "login-password" : "signup-password"}
                    name={isLogin ? "login-password" : "signup-password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => !isLogin && setShowPasswordFeedback(true)}
                    onBlur={() => setShowPasswordFeedback(false)}
                    required={usePassword}
                    minLength={8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    aria-label="Password"
                    aria-required={usePassword}
                    aria-invalid={!isLogin && password.length > 0 && passwordStrength.score < 3}
                    aria-describedby={!isLogin && password.length > 0 ? "password-strength" : undefined}
                  />
                  
                  {/* Password Strength Indicator - only show on signup */}
                  {!isLogin && password.length > 0 && (
                    <div id="password-strength" role="region" aria-live="polite" aria-label="Password strength">
                      <PasswordStrengthIndicator 
                        passwordStrength={passwordStrength}
                        showChecklist={showPasswordFeedback || passwordStrength.score < 4}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password - only show on signup */}
                {!isLogin && (
                  <div className="space-y-1">
                    <PasswordInput
                      id="confirm-password"
                      name="confirm-password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      hasError={confirmPassword.length > 0 && !passwordsMatch}
                      required={usePassword}
                      autoComplete="new-password"
                      aria-label="Confirm password"
                      aria-required={usePassword}
                      aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                      aria-describedby={confirmPassword.length > 0 && !passwordsMatch ? "confirm-password-error" : undefined}
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p id="confirm-password-error" className="text-xs text-destructive pl-1" role="alert">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <PasswordInput
                id={isLogin ? "login-password" : "signup-password"}
                name={isLogin ? "login-password" : "signup-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => !isLogin && setShowPasswordFeedback(true)}
                onBlur={() => setShowPasswordFeedback(false)}
                required
                minLength={8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                aria-label="Password"
                aria-required="true"
                aria-invalid={!isLogin && password.length > 0 && passwordStrength.score < 3}
                aria-describedby={!isLogin && password.length > 0 ? "password-strength" : undefined}
              />
              
              {/* Password Strength Indicator - only show on signup */}
              {!isLogin && password.length > 0 && (
                <div id="password-strength" role="region" aria-live="polite" aria-label="Password strength">
                  <PasswordStrengthIndicator 
                    passwordStrength={passwordStrength}
                    showChecklist={showPasswordFeedback || passwordStrength.score < 4}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password - only show on signup */}
            {!isLogin && (
              <div className="space-y-1">
                <PasswordInput
                  id="confirm-password"
                  name="confirm-password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  hasError={confirmPassword.length > 0 && !passwordsMatch}
                  required={!isLogin}
                  autoComplete="new-password"
                  aria-label="Confirm password"
                  aria-required="true"
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  aria-describedby={confirmPassword.length > 0 && !passwordsMatch ? "confirm-password-error" : undefined}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p id="confirm-password-error" className="text-xs text-destructive pl-1" role="alert">
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            {/* Remember me checkbox - only show on password login */}
            {isLogin && usePassword && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="h-5 w-5"
                />
                <label 
                  htmlFor="rememberMe" 
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            )}

            {/* Free Trial Info - only show on signup */}
            {!isLogin && !usePassword && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Start with 10 free jobs
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No payment required. Use SoloWipe free for your first 10 completed jobs, then choose a plan that works for you.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Terms checkbox - only show on password signup */}
            {!isLogin && usePassword && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked === true);
                  }}
                  className="h-5 w-5 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground leading-tight">
                    <label 
                      htmlFor="acceptTerms" 
                      className="cursor-pointer select-none"
                    >
                      I agree to the{' '}
                    </label>
                    <Link
                      to="/terms"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    >
                      Terms of Service
                    </Link>
                    <label 
                      htmlFor="acceptTerms" 
                      className="cursor-pointer select-none"
                    >
                      {' '}and{' '}
                    </label>
                    <Link
                      to="/privacy"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Account lockout warning */}
            {isLogin && failedAttempts >= 3 && failedAttempts < 5 && rateLimitSeconds === 0 && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-sm text-warning text-center">
                  ⚠️ {5 - failedAttempts} attempt{5 - failedAttempts !== 1 ? 's' : ''} remaining before temporary lockout
                </p>
              </div>
            )}

            {/* Lockout warning - 5+ failed attempts */}
            {isLogin && failedAttempts >= 5 && rateLimitSeconds === 0 && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">
                  🔒 Multiple failed attempts detected. Your account may be temporarily locked for security. Try again later or reset your password.
                </p>
              </div>
            )}

            {/* Rate limit warning */}
            {rateLimitSeconds > 0 && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">
                  Too many attempts. Please wait {rateLimitSeconds} second{rateLimitSeconds !== 1 ? 's' : ''} before trying again.
                </p>
              </div>
            )}

            {/* Primary Action Button */}
            <Button
              type="submit"
              disabled={
                loading || 
                rateLimitSeconds > 0 || 
                !emailValidation.isValid ||
                (usePassword && !isLogin && (passwordStrength.score < 3 || !passwordsMatch || !acceptedTerms))
              }
              className={cn(
                "w-full h-14 rounded-xl touch-target-lg", // Larger touch target for mobile
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "font-semibold text-base",
                "transition-all duration-200",
                loading && "opacity-75 cursor-not-allowed"
              )}
              aria-label={loading ? 'Processing' : usePassword ? (isLogin ? 'Sign in' : 'Create account') : 'Send magic link'}
              aria-busy={loading}
              aria-describedby={rateLimitSeconds > 0 ? 'rate-limit-message' : undefined}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                  <span>{usePassword ? 'Processing...' : 'Sending magic link...'}</span>
                </>
              ) : rateLimitSeconds > 0 ? (
                <>
                  <span>Wait {rateLimitSeconds}s</span>
                  <span id="rate-limit-message" className="sr-only">
                    Please wait {rateLimitSeconds} seconds before trying again
                  </span>
                </>
              ) : usePassword ? (
                isLogin ? 'Sign In' : 'Create Account'
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  {isLogin ? 'Send magic link' : 'Continue with email'}
                </>
              )}
            </Button>

            {/* Toggle between magic link and password */}
            {!usePassword && (
              <button
                type="button"
                onClick={() => setUsePassword(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors touch-target-lg py-2"
                aria-label="Switch to password sign in"
              >
                <Lock className="w-4 h-4 inline mr-1" />
                Or use password instead
              </button>
            )}

            {usePassword && (
              <button
                type="button"
                onClick={() => {
                  setUsePassword(false);
                  setPassword('');
                  setConfirmPassword('');
                  setBusinessName(''); // Reset business name when switching back
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors touch-target-lg py-2"
                aria-label="Switch to magic link sign in"
              >
                <Mail className="w-4 h-4 inline mr-1" />
                Or use magic link instead (easier!)
              </button>
            )}
          </form>

          {/* Social Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              disabled={oauthLoading !== null}
              aria-label="Sign in with Google"
              aria-busy={oauthLoading === 'google'}
              onClick={async () => {
                setOauthLoading('google');
                // Track OAuth signin start
                analytics.track('oauth_signin_started', { provider: 'google' });
                try {
                  const { error } = await signInWithOAuth('google');
                  if (error) {
                    // Track OAuth failure
                    analytics.track('oauth_signin_failed', {
                      provider: 'google',
                      reason: error.message,
                    });
                    let errorMessage = error.message || 'Failed to sign in with Google';
                    
                    // Provide more helpful error messages
                    if (error.message?.includes('redirect_uri')) {
                      errorMessage = 'Redirect URL configuration error. Please ensure Google OAuth is properly configured in Supabase.';
                    } else if (error.message?.includes('configuration')) {
                      errorMessage = 'Google OAuth is not properly configured. Please contact support.';
                    } else if (error.message?.includes('provider')) {
                      errorMessage = 'Google sign-in provider is not enabled. Please contact support.';
                    }
                    
                    toast({
                      title: 'Sign in failed',
                      description: errorMessage,
                      variant: 'destructive',
                    });
                    setOauthLoading(null);
                  } else {
                    // Track OAuth success (redirect will happen)
                    analytics.track('oauth_signin_completed', { provider: 'google' });
                    // Note: Supabase will redirect to Google
                    // The loading state will be cleared when user returns or if redirect fails
                  }
                } catch (err) {
                  console.error('[Auth] OAuth error:', err);
                  toast({
                    title: 'Sign in failed',
                    description: err instanceof Error ? err.message : 'Failed to sign in with Google. Please try again.',
                    variant: 'destructive',
                  });
                  setOauthLoading(null);
                }
              }}
              className="w-full h-14 rounded-xl"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </>
              )}
            </Button>
          </div>

          {isLogin && (
            <div className="mt-4 text-center space-y-2">
              <Link
                to="/forgot-password"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Forgot your password?
              </Link>
              
              {/* Resend verification email */}
              {showVerificationResend && email && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-2"
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Didn't receive verification email? Resend"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setUsePassword(false); // Reset to magic link when switching modes
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setEmailContext(null);
                setMagicLinkSent(false); // Reset magic link sent state
              }}
              className="text-primary font-medium hover:underline touch-target-lg px-2 py-2" // Larger touch target
              aria-label={isLogin ? "Switch to sign up" : "Switch to sign in"}
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Trust indicators - only show on signup */}
          {!isLogin && !usePassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center space-y-2"
            >
              <p className="text-xs text-muted-foreground">
                Trusted by 10,000+ cleaners across the UK
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-primary" />
                  Bank-level security
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-primary" />
                  GDPR compliant
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
