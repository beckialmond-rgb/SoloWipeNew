import { Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';

interface OnMyWayButtonProps {
  job: JobWithCustomer;
  businessName: string;
  className?: string;
}

export function OnMyWayButton({ job, businessName, className }: OnMyWayButtonProps) {
  const handleSendOnMyWay = () => {
    if (!job.customer.mobile_phone) return;
    
    const phone = job.customer.mobile_phone.replace(/\s/g, '');
    const message = encodeURIComponent(
      `Hi ${job.customer.name}, ${businessName} here. I'm on my way and should be with you in about 20 minutes!`
    );
    
    window.open(`sms:${phone}?body=${message}`, '_self');
  };

  if (!job.customer.mobile_phone) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleSendOnMyWay}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-3",
        "bg-primary text-primary-foreground rounded-xl",
        "font-medium text-sm shadow-sm",
        "hover:bg-primary/90 transition-colors",
        className
      )}
    >
      <Navigation className="w-4 h-4" />
      <span>On My Way</span>
    </motion.button>
  );
}
