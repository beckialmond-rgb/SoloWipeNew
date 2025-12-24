import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';

interface AskForReviewButtonProps {
  customerName: string;
  customerPhone: string | null;
  businessName: string;
  googleReviewLink?: string | null;
  className?: string;
}

export function AskForReviewButton({ 
  customerName, 
  customerPhone, 
  businessName, 
  googleReviewLink,
  className 
}: AskForReviewButtonProps) {
  const { showTemplatePicker } = useSMSTemplateContext();
  
  const handleAskForReview = () => {
    if (!customerPhone) {
      toast({
        title: "No phone number",
        description: "This customer doesn't have a phone number saved.",
        variant: "destructive",
      });
      return;
    }
    
    const context = prepareSMSContext({
      customerName,
      businessName,
      review_link: googleReviewLink || '',
    });

    showTemplatePicker('review_request', context, (message) => {
      openSMSApp(customerPhone, message);
    });
  };

  if (!customerPhone) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleAskForReview}
      className={cn(
        "flex items-center gap-2 px-4 py-2",
        "bg-amber-500/15 dark:bg-amber-500/20",
        "text-amber-700 dark:text-amber-300",
        "border border-amber-500/30 dark:border-amber-500/40",
        "rounded-lg text-sm font-semibold",
        "hover:bg-amber-500/25 dark:hover:bg-amber-500/30",
        "hover:border-amber-500/50 dark:hover:border-amber-500/60",
        "transition-all shadow-sm hover:shadow",
        "active:scale-95",
        className
      )}
    >
      <Star className="w-4 h-4 fill-amber-500/20" />
      <span>Ask for Review</span>
    </motion.button>
  );
}
