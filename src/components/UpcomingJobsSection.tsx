import { motion, AnimatePresence } from 'framer-motion';
import { format, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

export function UpcomingJobsSection({ jobs, onJobClick }: UpcomingJobsSectionProps) {
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
              <JobGroup title="Tomorrow" jobs={groupedJobs.tomorrow} onJobClick={onJobClick} />
            )}

            {/* This Week */}
            {groupedJobs.thisWeek.length > 0 && (
              <JobGroup title="This Week" jobs={groupedJobs.thisWeek} onJobClick={onJobClick} />
            )}

            {/* Later */}
            {groupedJobs.later.length > 0 && (
              <JobGroup title="Later" jobs={groupedJobs.later} onJobClick={onJobClick} />
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
}

function JobGroup({ title, jobs, onJobClick }: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <UpcomingJobCard key={job.id} job={job} onClick={onJobClick} />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
}

function UpcomingJobCard({ job, onClick }: UpcomingJobCardProps) {
  const jobDate = new Date(job.scheduled_date);
  const formattedDate = isTomorrow(jobDate)
    ? 'Tomorrow'
    : format(jobDate, 'EEE, d MMM');

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onClick?.(job)}
      className={cn(
        "w-full flex items-center justify-between text-left",
        "p-4 rounded-xl bg-muted/50",
        "border border-border/50",
        "hover:bg-muted transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {job.customer.name}
        </p>
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
    </motion.button>
  );
}