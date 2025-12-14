import { motion } from 'framer-motion';
import { MapPin, Phone, MessageSquare, PoundSterling, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';

interface UnpaidJobCardProps {
  job: JobWithCustomer;
  index: number;
  businessName?: string;
  onMarkPaid: () => void;
}

export function UnpaidJobCard({ job, index, businessName = 'Your window cleaner', onMarkPaid }: UnpaidJobCardProps) {
  const firstName = job.customer.name.split(' ')[0];
  const completedDate = job.completed_at ? format(new Date(job.completed_at), 'd MMM') : 'recently';
  const amount = (job.amount_collected || 0).toFixed(2);
  
  const handleSendReminder = () => {
    const message = encodeURIComponent(
      `Hi ${firstName}, ${businessName} here 👋\n\nJust a friendly reminder about your window clean from ${completedDate}.\n\nAmount due: £${amount}\n\nThanks so much!`
    );
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${message}`, '_self');
  };

  const handleCall = () => {
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate text-lg">
                {job.customer.name}
              </p>
              {job.customer.gocardless_id && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <CreditCard className="w-3 h-3" />
                  DD
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.customer.address}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Completed: {job.completed_at ? format(new Date(job.completed_at), 'd MMM yyyy') : 'Unknown'}
            </p>
          </div>
          <div className="text-right ml-4">
            <div className="flex items-center gap-1 text-warning">
              <PoundSterling className="w-5 h-5" />
              <span className="text-2xl font-bold">{(job.amount_collected || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {job.customer.mobile_phone && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={handleSendReminder}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Remind
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleCall}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="success"
            size="lg"
            className="flex-1"
            onClick={onMarkPaid}
          >
            Mark Paid
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
