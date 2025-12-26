import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailValidation } from '@/hooks/useEmailValidation';
import { EmailInput } from '@/components/EmailInput';
import { cn } from '@/lib/utils';

const ForgotPassword = forwardRef<HTMLDivElement>((_, ref) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const emailValidation = useEmailValidation(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before submission
    if (!emailValidation.isValid) {
      return;
    }
    
    setLoading(true);

    try {
      // Always show success message (even for invalid emails) to prevent email enumeration
      // This is an industry best practice for security
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Always show success to prevent email enumeration attacks
      // Supabase will only send email if the email exists, but we don't reveal this
      setSent(true);
      
      if (error) {
        // Log error but don't show to user (security best practice)
        console.error('[ForgotPassword] Error sending reset email:', error);
      }
    } catch (error) {
      // Log unexpected errors but still show success message
      console.error('[ForgotPassword] Unexpected error:', error);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

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
            {sent ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">
                  Check your email
                </h1>
                <p className="text-muted-foreground mt-2">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Forgot password?
                </h1>
                <p className="text-muted-foreground mt-2">
                  Enter your email and we'll send you a reset link
                </p>
              </>
            )}
          </div>

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <EmailInput
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                validation={emailValidation}
                showValidation={true}
                required
              />

              <Button
                type="submit"
                disabled={loading || !emailValidation.isValid}
                className={cn(
                  "w-full h-14 rounded-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "font-semibold text-base"
                )}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-8 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
});

ForgotPassword.displayName = 'ForgotPassword';

export default ForgotPassword;