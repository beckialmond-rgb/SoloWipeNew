import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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
  
  const handleAskForReview = () => {
    if (!customerPhone) {
      toast({
        title: "No phone number",
        description: "This customer doesn't have a phone number saved.",
        variant: "destructive",
      });
      return;
    }
    
    const phone = customerPhone.replace(/\s/g, '');
    
    let message = `Hi ${customerName}, thanks for using ${businessName}! If you're happy with the clean, we'd really appreciate a quick Google review.`;
    
    if (googleReviewLink) {
      message += ` ${googleReviewLink}`;
    }
    
    message += ` Thank you! 🙏`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`sms:${phone}?body=${encodedMessage}`, '_self');
    
    toast({
      title: "Review request opened",
      description: "SMS app opened with review request.",
    });
  };

  if (!customerPhone) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleAskForReview}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg",
        "text-xs font-medium",
        "hover:bg-amber-500/20 transition-colors",
        className
      )}
    >
      <Star className="w-3.5 h-3.5" />
      <span>Ask Review</span>
    </motion.button>
  );
}
