import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { PasswordInput } from '@/components/PasswordInput';
import { cn } from '@/lib/utils';

const ResetPassword = forwardRef<HTMLDivElement>((_, ref) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const passwordStrength = usePasswordStrength(password);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ResetPassword] Session check error:', sessionError);
          setError('Unable to verify reset link. Please request a new one.');
          setCheckingSession(false);
          return;
        }
        
        // If there's a session but it's from a normal login (not password recovery), redirect to dashboard
        if (session && !window.location.hash.includes('type=recovery')) {
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // If no session and not a recovery link, show error
        if (!session) {
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        console.error('[ResetPassword] Unexpected error checking session:', err);
        setError('An error occurred. Please request a new reset link.');
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength (industry standard: min 8 chars, good strength)
    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: 'Password too weak',
        description: 'Please choose a stronger password.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Verify we still have a valid session before updating password
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        toast({
          title: 'Session expired',
          description: 'Your reset link has expired. Please request a new one.',
          variant: 'destructive',
        });
        setError('Session expired. Please request a new reset link.');
        setLoading(false);
        return;
      }

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
        
        // Small delay to show success message, then redirect to login
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (err) {
      console.error('[ResetPassword] Unexpected error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div ref={ref} className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
              src="/SoloLogo.jpg" 
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
              src="/SoloLogo.jpg" 
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
                <PasswordInput
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowPasswordFeedback(true)}
                  onBlur={() => setShowPasswordFeedback(false)}
                  required
                  minLength={8}
                />
                
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <PasswordStrengthIndicator 
                    passwordStrength={passwordStrength}
                    showChecklist={showPasswordFeedback || passwordStrength.score < 4}
                  />
                )}
              </div>

              <div className="space-y-2">
                <PasswordInput
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  hasError={!passwordsMatch}
                />
                {!passwordsMatch && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !passwordsMatch || passwordStrength.score < 3 || password.length < 8}
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