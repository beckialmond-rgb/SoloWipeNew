import { motion, AnimatePresence } from 'framer-motion';
import { format, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp, SkipForward, Send, Loader2, Clock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  profile?: { gocardless_organisation_id?: string | null } | null;
  businessName?: string;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

export function UpcomingJobsSection({ jobs, onJobClick, onSkip, profile, businessName }: UpcomingJobsSectionProps) {
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
              <JobGroup title="Tomorrow" jobs={groupedJobs.tomorrow} onJobClick={onJobClick} onSkip={onSkip} profile={profile} businessName={businessName} />
            )}

            {/* This Week */}
            {groupedJobs.thisWeek.length > 0 && (
              <JobGroup title="This Week" jobs={groupedJobs.thisWeek} onJobClick={onJobClick} onSkip={onSkip} profile={profile} businessName={businessName} />
            )}

            {/* Later */}
            {groupedJobs.later.length > 0 && (
              <JobGroup title="Later" jobs={groupedJobs.later} onJobClick={onJobClick} onSkip={onSkip} profile={profile} businessName={businessName} />
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
  profile?: { gocardless_organisation_id?: string | null } | null;
  businessName?: string;
}

function JobGroup({ title, jobs, onJobClick, onSkip, profile, businessName }: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <UpcomingJobCard key={job.id} job={job} onClick={onJobClick} onSkip={onSkip} profile={profile} businessName={businessName} />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  profile?: { gocardless_organisation_id?: string | null } | null;
  businessName?: string;
}

function UpcomingJobCard({ job, onClick, onSkip, profile, businessName }: UpcomingJobCardProps) {
  const [isSendingDDLink, setIsSendingDDLink] = useState(false);
  
  const isGoCardlessConnected = !!profile?.gocardless_organisation_id;
  const hasActiveMandate = !!job.customer.gocardless_id;
  const canSendDDLink = isGoCardlessConnected && !hasActiveMandate && !!job.customer.mobile_phone;

  const jobDate = new Date(job.scheduled_date);
  const formattedDate = isTomorrow(jobDate)
    ? 'Tomorrow'
    : format(jobDate, 'EEE, d MMM');

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkip?.(job);
  };

  const sendDDLinkViaSMS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.customer.mobile_phone) return;

    setIsSendingDDLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
        body: { customerId: job.customer.id }
      });

      if (error) throw error;
      if (!data?.authorisationUrl) throw new Error('No authorization URL returned');

      const firstName = job.customer.name.split(' ')[0];
      const message = encodeURIComponent(
        `Hi ${firstName}, please set up your Direct Debit for ${businessName || 'us'} using this secure link: ${data.authorisationUrl}`
      );
      const phone = job.customer.mobile_phone.replace(/\s/g, '');
      window.open(`sms:${phone}?body=${message}`, '_blank');

      toast.success('SMS opened with DD link');
    } catch (error: any) {
      console.error('Failed to send DD link:', error);
      toast.error(error.message || 'Failed to generate DD link');
    } finally {
      setIsSendingDDLink(false);
    }
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
            {/* Mandate Status Badge */}
            {job.customer.gocardless_mandate_status === 'pending' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium flex-shrink-0">
                <Clock className="w-2.5 h-2.5" />
                Pending
              </span>
            ) : job.customer.gocardless_id ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium flex-shrink-0">
                <CreditCard className="w-2.5 h-2.5" />
                DD
              </span>
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

      {/* Send DD Link Button */}
      {canSendDDLink && (
        <button
          onClick={sendDDLinkViaSMS}
          disabled={isSendingDDLink}
          className={cn(
            "w-12 flex items-center justify-center",
            "bg-primary/10 hover:bg-primary/20 transition-colors border-l border-border/50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "disabled:opacity-50"
          )}
          aria-label={`Send DD link to ${job.customer.name}`}
        >
          {isSendingDDLink ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-primary" />
          )}
        </button>
      )}

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