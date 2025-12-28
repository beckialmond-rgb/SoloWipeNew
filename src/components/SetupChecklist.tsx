import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, CheckCircle, Sparkles, UserPlus, CreditCard, MessageSquare, Calendar, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

interface SetupChecklistProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function SetupChecklist({ onComplete, onDismiss }: SetupChecklistProps) {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'business-name',
      title: 'Set your business name',
      description: 'Personalize SoloWipe with your business name',
      icon: <Sparkles className="w-5 h-5" />,
      action: () => {
        // Navigate to settings or open business name modal
        window.location.href = '/settings';
      },
      actionLabel: 'Go to Settings',
    },
    {
      id: 'first-customer',
      title: 'Add your first customer',
      description: 'Start by adding at least one customer to your round',
      icon: <UserPlus className="w-5 h-5" />,
      action: () => {
        // Trigger add customer modal
        const event = new CustomEvent('openAddCustomer');
        window.dispatchEvent(event);
      },
      actionLabel: 'Add Customer',
    },
    {
      id: 'schedule-job',
      title: 'Schedule your first job',
      description: 'Create a job for your customer to get started',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'setup-direct-debit',
      title: 'Connect GoCardless (Optional)',
      description: 'Set up Direct Debit to automatically collect payments',
      icon: <CreditCard className="w-5 h-5" />,
      action: () => {
        window.location.href = '/settings';
      },
      actionLabel: 'Connect GoCardless',
    },
    {
      id: 'customize-sms',
      title: 'Customize SMS templates (Optional)',
      description: 'Personalize your customer communication templates',
      icon: <MessageSquare className="w-5 h-5" />,
      action: () => {
        window.location.href = '/sms-templates';
      },
      actionLabel: 'View Templates',
    },
  ];

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const completionPercentage = (completedItems.size / checklistItems.length) * 100;
  const allCompleted = completedItems.size === checklistItems.length;

  const handleComplete = () => {
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
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
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Get Started Checklist</h2>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <Circle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete these steps to get the most out of SoloWipe
            </p>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-foreground">
                  {completedItems.size} of {checklistItems.length} completed
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Checklist items */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {checklistItems.map((item, index) => {
                const isCompleted = completedItems.has(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border transition-all",
                      isCompleted
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/50 border-border hover:border-primary/30"
                    )}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="mt-0.5 flex-shrink-0"
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="text-primary mt-0.5">{item.icon}</div>
                        <h3 className={cn(
                          "font-semibold text-foreground",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                      {item.action && !isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.action?.();
                          }}
                          className="mt-1"
                        >
                          {item.actionLabel}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-muted/30">
            {allCompleted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">All set! You're ready to go.</span>
                </div>
                <Button
                  onClick={handleComplete}
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                >
                  I'll do this later
                </Button>
                <p className="text-sm text-muted-foreground">
                  {checklistItems.length - completedItems.size} steps remaining
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}





