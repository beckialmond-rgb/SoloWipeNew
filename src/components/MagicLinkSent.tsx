import { motion } from 'framer-motion';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MagicLinkSentProps {
  email: string;
  isNewUser?: boolean;
  isHelper?: boolean;
  isPlaceholder?: boolean;
  ownerName?: string;
  onBack: () => void;
  onResend?: () => void;
  resending?: boolean;
}

export function MagicLinkSent({
  email,
  isNewUser = false,
  isHelper = false,
  isPlaceholder = false,
  ownerName,
  onBack,
  onResend,
  resending = false,
}: MagicLinkSentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm"
    >
      {/* Success Icon with Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex justify-center mb-6"
      >
        <div className="relative">
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Icon container */}
          <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <Mail className="w-10 h-10 text-primary" />
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-foreground text-center mb-2"
      >
        Check your email
      </motion.h1>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-6"
      >
        <p className="text-muted-foreground mb-2">
          We sent a magic link to
        </p>
        <p className="font-semibold text-foreground break-all">
          {email}
        </p>
        {isHelper && ownerName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <p className="text-sm text-foreground">
              <span className="font-semibold">You're joining {ownerName}'s team!</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPlaceholder 
                ? "Once you sign up, you'll automatically be linked to your assigned jobs."
                : 'Click the link to get started'}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 mb-6"
      >
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Click the link in your email</p>
            <p>It will log you in automatically - no password needed!</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Check your spam folder</p>
            <p>If you don't see it, check spam or promotions</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Link expires in 24 hours</p>
            <p>But you can request a new one anytime</p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="space-y-3">
        {onResend && (
          <Button
            onClick={onResend}
            disabled={resending}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2"
                />
                Sending...
              </>
            ) : (
              'Resend magic link'
            )}
          </Button>
        )}
        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </div>

      {/* Help text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-muted-foreground text-center mt-6"
      >
        Having trouble? The link works on any device - try opening it on your phone or tablet.
      </motion.p>

      {/* Additional help for helpers */}
      {isHelper && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 p-3 rounded-lg bg-muted/50 border border-border"
        >
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Tip:</span> Once you click the link and sign in, you'll automatically be added to {ownerName || 'the team'} and can start receiving job assignments.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

