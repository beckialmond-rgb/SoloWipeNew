import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, UserPlus, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeFlowProps {
  businessName: string;
  onAddFirstCustomer: () => void;
  onDismiss: () => void;
}

export function WelcomeFlow({ businessName, onAddFirstCustomer, onDismiss }: WelcomeFlowProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: `Welcome to ${businessName}!`,
      subtitle: "Your window cleaning business, simplified.",
      icon: Sparkles,
      description: "Track jobs, manage customers, and collect payments - all from your phone with one hand.",
    },
    {
      title: "Ready in 30 seconds",
      subtitle: "Let's add your first customer",
      icon: UserPlus,
      description: "Tap below to add a customer. You can start with just a name and address - add details later.",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6 text-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-1">
            {currentStep.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {currentStep.subtitle}
          </p>
          
          <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {isLastStep ? (
            <div className="space-y-2">
              <Button
                onClick={onAddFirstCustomer}
                className="w-full fat-button rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add First Customer
              </Button>
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="w-full text-muted-foreground"
              >
                I'll do this later
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              className="w-full fat-button rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
