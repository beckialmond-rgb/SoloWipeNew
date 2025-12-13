import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { Sparkles, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const TRIAL_FEATURES = [
  'Unlimited customers & jobs',
  'Payment tracking & invoicing',
  'Route optimization',
  'Photo evidence capture',
  'Business insights & reports',
];

export function TrialGateModal() {
  const { isModalOpen, triggerAction, closePaywall } = useSoftPaywall();
  const navigate = useNavigate();

  const handleSignUp = () => {
    closePaywall();
    navigate('/auth?mode=signup');
  };

  const handleSignIn = () => {
    closePaywall();
    navigate('/auth');
  };

  const getActionMessage = () => {
    switch (triggerAction) {
      case 'complete':
        return 'Complete jobs and track your earnings';
      case 'skip':
        return 'Skip jobs and reschedule automatically';
      case 'add-customer':
        return 'Add unlimited customers to your round';
      case 'mark-paid':
        return 'Track payments and outstanding balances';
      case 'edit':
        return 'Edit customer details and preferences';
      default:
        return 'Unlock all features';
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closePaywall()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wide opacity-90">Pro Trial</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-primary-foreground">
              14 Days Free
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 mt-2">
              {getActionMessage()}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Features list */}
          <div className="space-y-3">
            {TRIAL_FEATURES.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-sm text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSignUp}
              className="w-full h-14 rounded-xl text-base font-semibold"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start 14-Day Free Trial
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleSignIn}
              className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign In
            </Button>
          </div>

          {/* No credit card note */}
          <p className="text-center text-xs text-muted-foreground">
            No credit card required • Cancel anytime
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-primary-foreground" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
