import { motion, AnimatePresence } from 'framer-motion';
import { format, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp, SkipForward, Clock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

export function UpcomingJobsSection({ jobs, onJobClick, onSkip }: UpcomingJobsSectionProps) {
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
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
          <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
            {totalUpcoming}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Tomorrow */}
            {groupedJobs.tomorrow.length > 0 && (
              <JobGroup title="Tomorrow" jobs={groupedJobs.tomorrow} onJobClick={onJobClick} onSkip={onSkip} />
            )}

            {/* This Week */}
            {groupedJobs.thisWeek.length > 0 && (
              <JobGroup title="This Week" jobs={groupedJobs.thisWeek} onJobClick={onJobClick} onSkip={onSkip} />
            )}

            {/* Later */}
            {groupedJobs.later.length > 0 && (
              <JobGroup title="Later" jobs={groupedJobs.later} onJobClick={onJobClick} onSkip={onSkip} />
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
}

function JobGroup({ title, jobs, onJobClick, onSkip }: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <UpcomingJobCard key={job.id} job={job} onClick={onJobClick} onSkip={onSkip} />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
}

function UpcomingJobCard({ job, onClick, onSkip }: UpcomingJobCardProps) {
  const jobDate = new Date(job.scheduled_date);
  const formattedDate = isTomorrow(jobDate)
    ? 'Tomorrow'
    : format(jobDate, 'EEE, d MMM');

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkip?.(job);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-stretch rounded-xl bg-muted/50",
        "border border-border/50 overflow-hidden"
      )}
    >
      <button
        onClick={() => onClick?.(job)}
        className={cn(
          "flex-1 flex items-center justify-between text-left p-4",
          "hover:bg-muted transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">
              {job.customer.name}
            </p>
            {/* Mandate Status Indicator */}
            {job.customer.gocardless_mandate_status === 'pending' ? (
              <span title="DD Pending"><Clock className="w-3.5 h-3.5 text-warning flex-shrink-0" /></span>
            ) : job.customer.gocardless_id ? (
              <span title="DD Active"><CreditCard className="w-3.5 h-3.5 text-success flex-shrink-0" /></span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground truncate">
              {job.customer.address}
            </p>
          </div>
        </div>
        
        <div className="text-right ml-4 flex-shrink-0">
          <p className="text-sm font-medium text-primary">
            {formattedDate}
          </p>
          <p className="text-sm text-muted-foreground">
            £{job.customer.price}
          </p>
        </div>
      </button>

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className={cn(
          "w-12 flex items-center justify-center",
          "bg-muted hover:bg-muted/80 transition-colors border-l border-border/50",
          "focus:outline-none focus:ring-2 focus:ring-muted focus:ring-offset-2"
        )}
        aria-label={`Skip ${job.customer.name}`}
      >
        <SkipForward className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
