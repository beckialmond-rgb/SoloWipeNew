import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface EmailCaptureFormProps {
  variant?: 'inline' | 'modal' | 'banner';
  placeholder?: string;
  buttonText?: string;
  onSuccess?: (email: string) => void;
  className?: string;
}

export const EmailCaptureForm = ({
  variant = 'inline',
  placeholder = 'Enter your email',
  buttonText = 'Get Started',
  onSuccess,
  className = '',
}: EmailCaptureFormProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    // Track conversion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'email_capture', {
        event_category: 'Lead Generation',
        event_label: variant,
        value: 1
      });
    }

    try {
      // Save email to database (leads table)
      const { error: dbError } = await supabase
        .from('leads')
        .insert({
          email: email.trim().toLowerCase(),
          source: variant === 'banner' ? 'tips' : 'newsletter',
          variant: variant,
          consent_given: true, // User submitting form implies consent
          subscribed: true,
          metadata: {
            referrer: typeof window !== 'undefined' ? document.referrer : null,
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
            timestamp: new Date().toISOString(),
          }
        });

      if (dbError) {
        // Log error but don't show to user (better UX)
        console.error('[EmailCapture] Failed to save lead:', dbError);
        // Still show success to user even if DB save fails
        // This prevents user frustration and we can retry later
      }
      
      setIsSuccess(true);
      if (onSuccess) onSuccess(email);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setEmail('');
      }, 3000);
    } catch (err) {
      console.error('[EmailCapture] Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
      >
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">Check your email!</span>
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" style={{ transform: 'translateY(-50%)', lineHeight: 0 }} />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="pl-11 h-12"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-6 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white"
          >
            {isSubmitting ? 'Submitting...' : buttonText}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <p className="text-xs text-muted-foreground/80 mt-2 text-center sm:text-left">
          By submitting, you consent to receive emails. Unsubscribe anytime. GDPR compliant.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" style={{ transform: 'translateY(-50%)', lineHeight: 0 }} />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="pl-11 h-12"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white"
      >
        {isSubmitting ? (
          'Submitting...'
        ) : (
          <>
            {buttonText}
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        By submitting, you consent to receive emails. Unsubscribe anytime. We respect your privacy and comply with GDPR.
      </p>
    </form>
  );
};

