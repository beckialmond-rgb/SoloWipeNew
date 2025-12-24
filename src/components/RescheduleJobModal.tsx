import { useState, useEffect } from 'react';
import { format, addWeeks } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { JobWithCustomer } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface RescheduleJobModalProps {
  job: JobWithCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (jobId: string, newDate: string) => Promise<void>;
}

export function RescheduleJobModal({
  job,
  open,
  onOpenChange,
  onReschedule,
}: RescheduleJobModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset selected date when job changes or modal opens
  // Auto-calculate next date based on customer frequency
  useEffect(() => {
    if (job && open) {
      // Calculate next date: current scheduled_date + customer frequency
      const currentDate = new Date(job.scheduled_date);
      const frequencyWeeks = job.customer?.frequency_weeks ?? 4;
      const nextDate = addWeeks(currentDate, frequencyWeeks);
      setSelectedDate(nextDate);
    } else if (!open) {
      setSelectedDate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, open]); // Only reset when job.id changes or modal opens

  // Clean up state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleReschedule = async () => {
    if (!job || !selectedDate) return;
    
    setIsSubmitting(true);
    try {
      await onReschedule(job.id, format(selectedDate, 'yyyy-MM-dd'));
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reschedule job. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Reschedule Job</DialogTitle>
          <DialogDescription className="sr-only">Select a new date for this job</DialogDescription>
        </DialogHeader>
        
        {job && (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Customer info */}
            <div className="space-y-1">
              <p className="font-medium text-foreground">{job.customer?.name || 'Unknown Customer'}</p>
              <p className="text-sm text-muted-foreground">{job.customer?.address || 'No address'}</p>
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal min-h-[60px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'EEE, d MMMM yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[60px]"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 min-h-[60px]"
                onClick={handleReschedule}
                disabled={!selectedDate || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
