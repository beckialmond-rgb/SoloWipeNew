import { useState, useEffect } from 'react';
import { format, startOfToday } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { JobWithCustomer } from '@/types/database';

interface BulkRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (newDate: string, sendSMS: boolean) => Promise<void>;
  jobCount: number;
  jobs: JobWithCustomer[];
  businessName: string | null | undefined;
}

export function BulkRescheduleModal({
  open,
  onOpenChange,
  onReschedule,
  jobCount,
  jobs,
  businessName,
}: BulkRescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [sendSMS, setSendSMS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Count jobs with phone numbers for SMS
  const jobsWithPhone = jobs.filter(job => job.customer?.mobile_phone).length;

  // Reset selected date when modal opens
  useEffect(() => {
    if (open) {
      // Default to today if modal opens
      setSelectedDate(startOfToday());
    } else {
      setSelectedDate(undefined);
    }
  }, [open]);

  // Clean up state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSendSMS(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleReschedule = async () => {
    if (!selectedDate) return;
    
    setIsSubmitting(true);
    try {
      await onReschedule(format(selectedDate, 'yyyy-MM-dd'), sendSMS);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reschedule jobs. Please try again.',
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
          <DialogTitle>Bulk Reschedule</DialogTitle>
          <DialogDescription>
            Reschedule {jobCount} job{jobCount !== 1 ? 's' : ''} to a new date
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-y-auto flex-1">
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
                  disabled={(date) => date < startOfToday()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Rain Check SMS Option */}
          {jobsWithPhone > 0 && (
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="send-sms"
                checked={sendSMS}
                onCheckedChange={(checked) => setSendSMS(checked === true)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor="send-sms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <span className="text-muted-foreground">(Optional)</span> Send rain check SMS to customers
                </label>
                <p className="text-xs text-muted-foreground">
                  Send a weather-related rescheduling message to {jobsWithPhone} customer{jobsWithPhone !== 1 ? 's' : ''} with phone numbers. Jobs will be rescheduled regardless.
                </p>
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Rescheduling...' : `Reschedule ${jobCount} Job${jobCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

