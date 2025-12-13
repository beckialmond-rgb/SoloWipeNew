import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Loader2 } from 'lucide-react';
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
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const passwordStrength = usePasswordStrength(password);
  const emailValidation = useEmailValidation(email);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

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
