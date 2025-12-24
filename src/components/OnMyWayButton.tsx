import { Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';

interface OnMyWayButtonProps {
  job: JobWithCustomer;
  businessName: string;
  className?: string;
}

export function OnMyWayButton({ job, businessName, className }: OnMyWayButtonProps) {
  const { showTemplatePicker } = useSMSTemplateContext();

  const handleSendOnMyWay = () => {
    if (!job.customer.mobile_phone) return;
    
    // Format scheduled date if available
    const scheduledDate = job.scheduled_date 
      ? format(new Date(job.scheduled_date), 'EEEE, d MMMM yyyy')
      : '';
    
    const context = prepareSMSContext({
      customerName: job.customer.name,
      customerAddress: job.customer.address,
      scheduledDate: job.scheduled_date,
      businessName,
      serviceType: 'Window Clean',
    });

    showTemplatePicker('on_my_way', context, (message) => {
      openSMSApp(job.customer.mobile_phone!, message);
    });
  };

  if (!job.customer.mobile_phone) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleSendOnMyWay}
      className={cn(
        "flex items-center justify-center gap-2 px-5 py-3.5",
        "bg-primary text-primary-foreground rounded-xl",
        "font-bold text-base shadow-lg",
        "hover:bg-primary/90 hover:shadow-xl transition-all",
        "border-2 border-primary/30",
        "touch-sm min-h-[48px]",
        className
      )}
    >
      <Navigation className="w-5 h-5" strokeWidth={2.5} />
      <span>On My Way</span>
    </motion.button>
  );
}
