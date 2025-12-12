import { motion } from 'framer-motion';
import { MapPin, Phone, PoundSterling } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';

interface UnpaidJobCardProps {
  job: JobWithCustomer;
  index: number;
  onMarkPaid: () => void;
}

export function UnpaidJobCard({ job, index, onMarkPaid }: UnpaidJobCardProps) {
  const handleSendReminder = () => {
    const message = encodeURIComponent(
      `Hi ${job.customer.name}, just a friendly reminder that your last window clean is still outstanding. £${(job.amount_collected || 0).toFixed(2)} is due. Thanks!`
    );
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${message}`, '_self');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate text-lg">
              {job.customer.name}
            </p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{job.customer.address}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed: {job.completed_at ? format(new Date(job.completed_at), 'd MMM yyyy') : 'Unknown'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-600">
              <PoundSterling className="w-5 h-5" />
              <span className="text-2xl font-bold">{(job.amount_collected || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {job.customer.mobile_phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-12"
              onClick={handleSendReminder}
            >
              <Phone className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            onClick={onMarkPaid}
          >
            Mark Paid
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
