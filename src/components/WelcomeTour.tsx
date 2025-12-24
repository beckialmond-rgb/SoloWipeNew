import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Home, Users, Calendar, Wallet, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to SoloWipe!",
    description: "Your all-in-one window cleaning business manager. Let's take a quick tour of the key features.",
    icon: <Home className="w-8 h-8" />,
  },
  {
    title: "Today's Dashboard",
    description: "See all your jobs for today at a glance. Mark jobs as done with one tap, and the next appointment is automatically scheduled.",
    icon: <Home className="w-8 h-8" />,
    highlight: "today",
  },
  {
    title: "Customer Management",
    description: "Keep track of all your customers, their addresses, prices, and special notes. Send SMS reminders and get directions with one tap.",
    icon: <Users className="w-8 h-8" />,
    highlight: "customers",
  },
  {
    title: "Calendar View",
    description: "Plan ahead with the calendar view. See your scheduled jobs for the week and month to optimize your routes.",
    icon: <Calendar className="w-8 h-8" />,
    highlight: "calendar",
  },
  {
    title: "Money & Payments",
    description: "Track unpaid jobs and mark them as collected. See your earnings history and export reports for your accountant.",
    icon: <Wallet className="w-8 h-8" />,
    highlight: "money",
  },
  {
    title: "You're All Set!",
    description: "That's the basics! Explore the Settings for more options. Tap anywhere to start using SoloWipe.",
    icon: <Settings className="w-8 h-8" />,
  },
];

interface WelcomeTourProps {
  onComplete: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-8 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  {step.icon}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  {step.title}
                </h2>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 pt-0">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={cn(
                "gap-1",
                isFirstStep && "invisible"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              className="gap-1 min-w-[100px]"
            >
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <div className="pb-6 text-center">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage tour visibility
export function useWelcomeTour() {
  const [showTour, setShowTour] = useState(false);
  const TOUR_COMPLETED_KEY = 'solowipe_tour_completed';

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setShowTour(false);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setShowTour(true);
  };

  return { showTour, completeTour, resetTour };
}
