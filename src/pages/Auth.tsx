import { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Building, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Password strength validation
const getPasswordStrength = (password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return { checks, score, strength };
};

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
  
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  "w-full h-14 pl-12 pr-4 rounded-xl",
                  "bg-muted border-0",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary"
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => !isLogin && setShowPasswordFeedback(true)}
                  onBlur={() => setShowPasswordFeedback(false)}
                  required
                  minLength={8}
                  className={cn(
                    "w-full h-14 pl-12 pr-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>
              
              {/* Password Strength Indicator - only show on signup */}
              {!isLogin && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          passwordStrength.score >= level
                            ? passwordStrength.strength === 'strong' ? 'bg-success'
                              : passwordStrength.strength === 'good' ? 'bg-success/70'
                              : passwordStrength.strength === 'fair' ? 'bg-warning'
                              : 'bg-destructive'
                            : 'bg-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>
                  
                  {/* Strength label */}
                  <p className={cn(
                    "text-xs font-medium",
                    passwordStrength.strength === 'strong' ? 'text-success'
                      : passwordStrength.strength === 'good' ? 'text-success/80'
                      : passwordStrength.strength === 'fair' ? 'text-warning'
                      : 'text-destructive'
                  )}>
                    Password strength: {passwordStrength.strength}
                  </p>
                  
                  {/* Requirements checklist - show when focused or weak */}
                  {(showPasswordFeedback || passwordStrength.score < 4) && (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={cn("flex items-center gap-1", passwordStrength.checks.minLength ? "text-success" : "text-muted-foreground")}>
                        {passwordStrength.checks.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        8+ characters
                      </div>
                      <div className={cn("flex items-center gap-1", passwordStrength.checks.hasUppercase ? "text-success" : "text-muted-foreground")}>
                        {passwordStrength.checks.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Uppercase
                      </div>
                      <div className={cn("flex items-center gap-1", passwordStrength.checks.hasLowercase ? "text-success" : "text-muted-foreground")}>
                        {passwordStrength.checks.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Lowercase
                      </div>
                      <div className={cn("flex items-center gap-1", passwordStrength.checks.hasNumber ? "text-success" : "text-muted-foreground")}>
                        {passwordStrength.checks.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Number
                      </div>
                      <div className={cn("flex items-center gap-1 col-span-2", passwordStrength.checks.hasSpecial ? "text-success" : "text-muted-foreground")}>
                        {passwordStrength.checks.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Special character (!@#$%...)
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
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
