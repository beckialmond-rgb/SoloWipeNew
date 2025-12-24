import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, ChevronDown, ChevronUp, Mail, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I add a new customer?",
    answer: "Go to the Customers tab and tap the '+' button in the top right. Fill in the customer details including name, address, price, and cleaning frequency.",
  },
  {
    question: "How do I mark a job as complete?",
    answer: "On the Today tab, find the job you've completed and tap the green 'Done' button. The job will be marked complete and automatically reschedule based on the customer's frequency.",
  },
  {
    question: "How do I skip a job?",
    answer: "If a customer isn't home or requests to skip, tap the 'Skip' button on the job card. The job will be rescheduled to their next regular date.",
  },
  {
    question: "How do I set up Direct Debit payments?",
    answer: "Go to Settings and connect your GoCardless account. Once connected, you can set up Direct Debit mandates for individual customers from their customer card.",
  },
  {
    question: "How do I track my earnings?",
    answer: "The Money tab shows all unpaid and paid jobs. For detailed reports and charts, go to Settings > Earnings & Stats.",
  },
  {
    question: "How do I export data for my accountant?",
    answer: "Go to Settings > Export for Xero. Select a date range and download a CSV file that's compatible with Xero and other accounting software.",
  },
  {
    question: "Can I use the app offline?",
    answer: "Yes! SoloWipe works offline. Any changes you make will sync automatically when you're back online. Look for the offline indicator at the top of the screen.",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "Go to Settings and find the Subscription section. Tap 'Manage Subscription' to open the billing portal where you can cancel or change your plan.",
  },
];

interface HelpSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpSection({ isOpen, onClose }: HelpSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleContactSupport = () => {
    window.location.href = 'mailto:aaron@solowipe.co.uk?subject=SoloWipe Support Request';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-2xl border-t border-border overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Help & Support</h2>
                  <p className="text-sm text-muted-foreground">Get answers to common questions</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] pb-safe">
              {/* Quick Actions */}
              <div className="p-4 border-b border-border">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleContactSupport}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="text-sm">Email Support</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://solowipe.app/terms', '_blank')}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Terms & Privacy</span>
                  </Button>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-2">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={false}
                      className="bg-muted/30 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-foreground pr-4">{faq.question}</span>
                        {expandedIndex === index ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedIndex === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm text-muted-foreground">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Still need help */}
              <div className="p-4 pt-0">
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-foreground mb-1">Still need help?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    We're here to help. Email us and we'll get back to you within 24 hours.
                  </p>
                  <Button onClick={handleContactSupport} className="min-h-[44px]">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
