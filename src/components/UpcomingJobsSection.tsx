import { motion, AnimatePresence } from 'framer-motion';
import { format, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp, SkipForward, Clock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { JobWithCustomer } from '@/types/database';
import { cn, formatCurrency } from '@/lib/utils';
import { TextCustomerButton } from '@/components/TextCustomerButton';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

export function UpcomingJobsSection({ jobs, onJobClick, onSkip, businessName = 'SoloWipe' }: UpcomingJobsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group jobs by date category
  const groupedJobs: GroupedJobs = jobs.reduce(
    (acc, job) => {
      const jobDate = new Date(job.scheduled_date);
      
      if (isTomorrow(jobDate)) {
        acc.tomorrow.push(job);
      } else if (isThisWeek(jobDate, { weekStartsOn: 1 })) {
        acc.thisWeek.push(job);
      } else {
        acc.later.push(job);
      }
      
      return acc;
    },
    { tomorrow: [], thisWeek: [], later: [] } as GroupedJobs
  );

  const totalUpcoming = jobs.length;

  if (totalUpcoming === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2 mb-4"
        aria-expanded={isExpanded}
        aria-controls="upcoming-jobs-content"
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} upcoming jobs section`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
          <span 
            className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground"
            aria-label={`${totalUpcoming} upcoming ${totalUpcoming === 1 ? 'job' : 'jobs'}`}
          >
            {totalUpcoming}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="upcoming-jobs-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Tomorrow */}
            {groupedJobs.tomorrow.length > 0 && (
              <JobGroup title="Tomorrow" jobs={groupedJobs.tomorrow} onJobClick={onJobClick} onSkip={onSkip} businessName={businessName} />
            )}

            {/* This Week */}
            {groupedJobs.thisWeek.length > 0 && (
              <JobGroup title="This Week" jobs={groupedJobs.thisWeek} onJobClick={onJobClick} onSkip={onSkip} businessName={businessName} />
            )}

            {/* Later */}
            {groupedJobs.later.length > 0 && (
              <JobGroup title="Later" jobs={groupedJobs.later} onJobClick={onJobClick} onSkip={onSkip} businessName={businessName} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface JobGroupProps {
  title: string;
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
}

function JobGroup({ title, jobs, onJobClick, onSkip, businessName = 'SoloWipe' }: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2" role="list" aria-label={`${title} jobs`}>
        {jobs.map((job) => (
          <UpcomingJobCard key={job.id} job={job} onClick={onJobClick} onSkip={onSkip} businessName={businessName} />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
}

function UpcomingJobCard({ job, onClick, onSkip, businessName = 'SoloWipe' }: UpcomingJobCardProps) {
  const jobDate = new Date(job.scheduled_date);
  const formattedDate = isTomorrow(jobDate)
    ? 'Tomorrow'
    : format(jobDate, 'EEE, d MMM');

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkip?.(job);
  };

  const customerName = job.customer?.name || 'Unknown Customer';
  const customerAddress = job.customer?.address || 'No address';
  const customerPrice = job.customer?.price || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-stretch rounded-xl bg-card shadow-sm",
        "h-[72px] sm:h-[80px]",
        "border border-border overflow-hidden flex-shrink-0"
      )}
      role="listitem"
    >
      <button
        onClick={() => onClick?.(job)}
        className={cn(
          "flex-1 flex items-center justify-between text-left p-4",
          "hover:bg-muted transition-colors overflow-hidden",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "touch-target"
        )}
        aria-label={`View details for ${customerName} - ${customerAddress} on ${formattedDate}`}
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 mb-1.5">
            <p className="font-bold text-foreground text-base leading-tight truncate flex-1 min-w-0">
              {customerName}
            </p>
            {/* Mandate Status Indicator */}
            {job.customer?.gocardless_mandate_status === 'pending' ? (
              <span 
                title="Direct Debit setup pending"
                aria-label="Direct Debit setup pending"
                className="shrink-0"
              >
                <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
              </span>
            ) : job.customer?.gocardless_id ? (
              <span 
                title="Direct Debit active"
                aria-label="Direct Debit active"
                className="shrink-0"
              >
                <CreditCard className="w-4 h-4 text-success" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-muted-foreground truncate min-w-0 leading-snug">
              {customerAddress.split(/[,\n]/)[0].trim()}
            </p>
          </div>
        </div>
        
        <div className="text-right ml-4 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-0.5" aria-label={`Scheduled for ${formattedDate}`}>
            {formattedDate}
          </p>
          <p className="text-base font-semibold text-foreground" aria-label={`Price: ${formatCurrency(customerPrice)}`}>
            {formatCurrency(customerPrice)}
          </p>
        </div>
      </button>

      {/* Action Buttons */}
      <div 
        className="flex flex-col border-l border-border shrink-0 w-[64px]" 
        role="group" 
        aria-label="Job actions"
      >
        {/* Text Button */}
        {job.customer?.mobile_phone ? (
          <div className="flex items-center justify-center border-b border-border h-[36px] sm:h-[40px]">
            <TextCustomerButton
              phoneNumber={job.customer.mobile_phone}
              customerName={customerName}
              customerAddress={customerAddress}
              jobPrice={customerPrice}
              scheduledDate={job.scheduled_date}
              businessName={businessName}
              iconOnly={true}
            />
          </div>
        ) : null}
        
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className={cn(
            "flex items-center justify-center w-full transition-colors",
            "bg-muted hover:bg-muted/80 active:bg-muted/60",
            "focus:outline-none focus:ring-2 focus:ring-muted focus:ring-offset-2",
            job.customer?.mobile_phone 
              ? "h-[36px] sm:h-[40px]" 
              : "h-[72px] sm:h-[80px]"
          )}
          aria-label={`Skip job for ${customerName}`}
        >
          <SkipForward className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
