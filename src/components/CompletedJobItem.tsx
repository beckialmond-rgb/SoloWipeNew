import { motion } from 'framer-motion';
import { Check, Clock, CheckCircle, Circle, StickyNote, Image } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CompletedJobItemProps {
  job: JobWithCustomer;
  index: number;
  onMarkPaid?: (job: JobWithCustomer) => void;
  onAddNote?: (job: JobWithCustomer) => void;
}

export function CompletedJobItem({ job, index, onMarkPaid, onAddNote }: CompletedJobItemProps) {
  const [showPhoto, setShowPhoto] = useState(false);
  const completedTime = job.completed_at 
    ? format(new Date(job.completed_at), 'HH:mm')
    : '';

  const isPaid = job.payment_status === 'paid';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-card rounded-xl border border-border min-h-[80px]"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-success" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {job.customer.name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {job.customer.address}
          </p>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-success text-lg">
              £{job.amount_collected}
            </p>
            {isPaid ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <Circle className="w-5 h-5 text-warning fill-warning" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {completedTime}
            {isPaid && job.payment_method && (
              <span className="capitalize ml-1">• {job.payment_method}</span>
            )}
          </div>
        </div>
      </div>

      {/* Photo evidence thumbnail */}
      {job.photo_url && (
        <div className="mt-3">
          {showPhoto ? (
            <div className="relative">
              <img 
                src={job.photo_url} 
                alt="Job evidence" 
                className="w-full h-48 object-cover rounded-lg cursor-pointer"
                onClick={() => setShowPhoto(false)}
              />
              <p className="text-xs text-muted-foreground text-center mt-1">Tap to minimize</p>
            </div>
          ) : (
            <button
              onClick={() => setShowPhoto(true)}
              className="flex items-center gap-3 w-full"
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img 
                  src={job.photo_url} 
                  alt="Job evidence thumbnail" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-sm text-primary">Photo evidence captured</span>
            </button>
          )}
        </div>
      )}

      {/* Notes section */}
      {job.notes && (
        <div 
          className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20 cursor-pointer"
          onClick={() => onAddNote?.(job)}
        >
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">{job.notes}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(!job.notes || !isPaid) && (onAddNote || onMarkPaid) && (
        <div className="flex items-center gap-3 mt-4">
          {!job.notes && onAddNote && (
            <Button
              size="sm"
              variant="warning"
              onClick={() => onAddNote(job)}
            >
              <StickyNote className="w-4 h-4 mr-1.5" />
              Add Note
            </Button>
          )}
          {!isPaid && onMarkPaid && (
            <Button
              size="sm"
              variant="success"
              onClick={() => onMarkPaid(job)}
            >
              Mark Paid
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
