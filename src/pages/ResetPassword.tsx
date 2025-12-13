import { useState, useEffect, forwardRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
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

const ResetPassword = forwardRef<HTMLDivElement>((_, ref) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setSuccess(true);
        toast({
          title: 'Password updated!',
          description: 'You can now sign in with your new password.',
        });
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div ref={ref} className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <img 
              src="/logo.png" 
              alt="SoloWipe" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Link Expired
            </h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button
              onClick={() => navigate('/forgot-password')}
              className={cn(
                "w-full h-14 rounded-xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "font-semibold text-base"
              )}
            >
              Request New Link
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col">
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
            {success ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">
                  Password Updated!
                </h1>
                <p className="text-muted-foreground mt-2">
                  Redirecting you to the app...
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Set new password
                </h1>
                <p className="text-muted-foreground mt-2">
                  Enter your new password below
                </p>
              </>
            )}
          </div>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordFeedback(true)}
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
                
                {/* Password Strength Indicator */}
                {password.length > 0 && (
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
                    
                    {/* Requirements checklist */}
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

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={cn(
                      "w-full h-14 pl-12 pr-4 rounded-xl",
                      "bg-muted border-0",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2",
                      !passwordsMatch ? "focus:ring-destructive ring-2 ring-destructive" : "focus:ring-primary"
                    )}
                  />
                </div>
                {!passwordsMatch && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Passwords do not match
                  </p>
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
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
});

ResetPassword.displayName = 'ResetPassword';

export default ResetPassword;