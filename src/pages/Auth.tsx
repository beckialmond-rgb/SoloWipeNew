import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useEmailValidation } from '@/hooks/useEmailValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { PasswordInput } from '@/components/PasswordInput';
import { EmailInput } from '@/components/EmailInput';
import { cn } from '@/lib/utils';

const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signInWithOAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const businessNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  const passwordStrength = usePasswordStrength(password);
  const emailValidation = useEmailValidation(email);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Auto-focus first input when form loads or mode changes
  useEffect(() => {
    if (!authLoading && !user) {
      if (isLogin) {
        emailRef.current?.focus();
      } else {
        businessNameRef.current?.focus();
      }
    }
  }, [isLogin, authLoading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // Store remember me preference
          if (!rememberMe) {
            sessionStorage.setItem('clearSessionOnClose', 'true');
          } else {
            sessionStorage.removeItem('clearSessionOnClose');
          }
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, businessName);
        if (error) {
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome to SoloWipe!',
            description: 'Your account has been created.',
          });
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
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

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col">
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
              src="/logo.png" 
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
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={businessNameRef}
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required={!isLogin}
                  className={cn(
                    "w-full h-14 pl-12 pr-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>
            )}

            <EmailInput
              ref={emailRef}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              validation={emailValidation}
              showValidation={!isLogin}
              required
            />

            <div className="space-y-2">
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => !isLogin && setShowPasswordFeedback(true)}
                onBlur={() => setShowPasswordFeedback(false)}
                required
                minLength={8}
              />
              
              {/* Password Strength Indicator - only show on signup */}
              {!isLogin && password.length > 0 && (
                <PasswordStrengthIndicator 
                  passwordStrength={passwordStrength}
                  showChecklist={showPasswordFeedback || passwordStrength.score < 4}
                />
              )}
            </div>

            {/* Remember me checkbox - only show on login */}
            {isLogin && (
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

            <Button
              type="submit"
              disabled={loading || (!isLogin && (!emailValidation.isValid || passwordStrength.score < 3))}
              className={cn(
                "w-full h-14 rounded-xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "font-semibold text-base"
              )}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
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
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithOAuth('google')}
              className="flex-1 h-14 rounded-xl"
            >
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
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithOAuth('apple')}
              className="flex-1 h-14 rounded-xl"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Button>
          </div>

          {/* Forgot Password Link (only show on login) */}
          {isLogin && (
            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';

export default Auth;
