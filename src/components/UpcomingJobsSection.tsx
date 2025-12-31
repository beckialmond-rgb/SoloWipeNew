import { motion, AnimatePresence } from 'framer-motion';
import { isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp, Clock, CreditCard, Search, X, CheckSquare, Square, MessageSquare, UserCheck } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { JobWithCustomer, JobWithCustomerAndAssignment } from '@/types/database';
import { cn, formatCurrency } from '@/lib/utils';
import { TextCustomerButton } from '@/components/TextCustomerButton';
import { formatJobDate, isTomorrowDate } from '@/utils/dateUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { BulkAssignmentModal } from '@/components/BulkAssignmentModal';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
  onSelectAll?: () => void;
  onBulkRescheduleToggle?: () => void;
  onBulkReschedule?: () => void;
  onBulkAssign?: (jobIds: string[], userId: string) => Promise<void>;
  helpers?: Array<{
    id: string;
    email?: string;
    name: string;
    initials: string;
    isPlaceholder: boolean;
    hasPendingInvite: boolean;
    inviteExpiresAt?: string;
  }>;
  currentUserId?: string;
  isLoadingHelpers?: boolean;
  onCreateHelper?: (name: string, email?: string) => Promise<any>;
  onRemoveHelper?: (helperId: string) => Promise<void>;
  onInviteSent?: () => void;
  isOwner?: boolean;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

/**
 * UPCOMING JOBS SECTION COMPONENT
 * 
 * Purpose: Displays all future jobs (including tomorrow) with bulk planning actions.
 * 
 * Action Philosophy:
 * - Bulk Assign: Assign multiple jobs to helpers (primary action)
 * - Bulk Reschedule: Reschedule multiple jobs efficiently (primary action)
 * - Bulk Reminder: Send reminder messages to multiple customers
 * - Skip: Available for future jobs (advance scheduling decisions)
 * - Text: Available for customer communication
 * - Individual Reschedule: Available via onJobClick (opens modal)
 * - Complete: NOT available (only today's jobs can be completed)
 * 
 * Why no complete action? Future jobs are not executable yet.
 * Complete action is reserved for Today section (active execution workflow).
 */
export function UpcomingJobsSection({ 
  jobs, 
  onJobClick, 
  businessName = 'SoloWipe',
  bulkMode = false,
  selectedJobIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onBulkRescheduleToggle,
  onBulkReschedule,
  onBulkAssign,
  helpers = [],
  currentUserId,
  isLoadingHelpers = false,
  onCreateHelper,
  onRemoveHelper,
  onInviteSent,
  isOwner = false,
}: UpcomingJobsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('solowipe_upcoming_jobs_hidden') !== 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);
  const [bulkReminderMode, setBulkReminderMode] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);
  const [smsQueue, setSmsQueue] = useState<{ index: number; jobIds: string[] } | null>(null);
  const [showNextSMS, setShowNextSMS] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { showTemplatePicker } = useSMSTemplateContext();

  const handleToggleExpand = (open: boolean) => {
    setIsExpanded(open);
    if (open) {
      localStorage.removeItem('solowipe_upcoming_jobs_hidden');
    } else {
      localStorage.setItem('solowipe_upcoming_jobs_hidden', 'true');
    }
  };

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    
    const query = searchQuery.toLowerCase().trim();
    return jobs.filter(job => {
      const customerName = job.customer?.name || '';
      const customerAddress = job.customer?.address || '';
      return (
        customerName.toLowerCase().includes(query) ||
        customerAddress.toLowerCase().includes(query)
      );
    });
  }, [jobs, searchQuery]);

  /**
   * GROUP JOBS BY DATE CATEGORY
   * 
   * Groups jobs into: Tomorrow, This Week, Later
   * Tomorrow jobs are now included in Upcoming section for unified planning workflow.
   */
  const groupedJobs: GroupedJobs = filteredJobs.reduce(
    (acc, job) => {
      const jobDate = new Date(job.scheduled_date);
      
      if (isTomorrowDate(job.scheduled_date)) {
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

  const totalUpcoming = filteredJobs.length;
  const originalTotal = jobs.length;

  // Restore SMS queue on mount
  useEffect(() => {
    const stored = localStorage.getItem('solowipe_sms_queue');
    if (stored) {
      try {
        const queue = JSON.parse(stored);
        setSmsQueue(queue);
        setShowNextSMS(true);
      } catch (e) {
        localStorage.removeItem('solowipe_sms_queue');
      }
    }
  }, []);

  // Handle sequential SMS sending - detect when user returns from SMS app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && smsQueue) {
        setShowNextSMS(true);
      }
    };

    const handleFocus = () => {
      if (smsQueue) {
        setShowNextSMS(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [smsQueue]);

  // Handle bulk assign
  const handleBulkAssign = async (userId: string) => {
    if (!onBulkAssign || selectedJobIds.size === 0) return;
    const jobIdsArray = Array.from(selectedJobIds);
    setBulkAssignmentModalOpen(false);
    await onBulkAssign(jobIdsArray, userId);
    setBulkAssignmentMode(false);
    if (onToggleSelect) {
      selectedJobIds.forEach(id => onToggleSelect(id)); // Clear selection
    }
  };

  // Handle bulk reminder SMS
  const handleBulkReminder = () => {
    const selectedJobs = filteredJobs.filter(job => selectedJobIds.has(job.id));
    const jobsWithPhone = selectedJobs.filter(job => job.customer?.mobile_phone);
    if (jobsWithPhone.length === 0) {
      toast({
        title: 'No phone numbers',
        description: 'Selected jobs do not have customer phone numbers.',
        variant: 'destructive',
      });
      return;
    }

    const jobIds = jobsWithPhone.map(job => job.id);
    const queue = { index: 0, jobIds };
    setSmsQueue(queue);
    localStorage.setItem('solowipe_sms_queue', JSON.stringify(queue));
    openSMSForJob(jobsWithPhone[0], 0, jobIds);
    setBulkReminderMode(false);
  };

  const openSMSForJob = (job: JobWithCustomer, index: number, jobIds: string[]) => {
    if (!job.customer?.mobile_phone) return;

    const customerName = job.customer.name || 'Customer';
    const customerAddress = job.customer.address || 'No address';
    const jobPrice = (job.customer.price && job.customer.price > 0) ? job.customer.price : undefined;
    const isGoCardlessActive = job.customer?.gocardless_mandate_status === 'active' && !!job.customer?.gocardless_id;

    const context = prepareSMSContext({
      customerName,
      customerAddress,
      price: jobPrice,
      jobTotal: jobPrice,
      scheduledDate: job.scheduled_date,
      isGoCardlessActive,
      businessName,
      serviceType: 'Window Clean',
    });

    showTemplatePicker('tomorrow_sms_button', context, (message) => {
      setShowNextSMS(false);
      openSMSApp(job.customer.mobile_phone!, message, user?.id, job.id);
    });
  };

  const handleNextSMS = () => {
    if (!smsQueue) return;

    const nextIndex = smsQueue.index + 1;
    const nextJobId = smsQueue.jobIds[nextIndex];

    if (nextIndex >= smsQueue.jobIds.length) {
      setSmsQueue(null);
      setShowNextSMS(false);
      localStorage.removeItem('solowipe_sms_queue');
      toast({
        title: 'All reminders sent!',
        description: `Sent ${smsQueue.jobIds.length} reminder${smsQueue.jobIds.length > 1 ? 's' : ''}.`,
      });
      return;
    }

    const nextJob = filteredJobs.find(job => job.id === nextJobId);
    if (nextJob) {
      const updatedQueue = { ...smsQueue, index: nextIndex };
      setSmsQueue(updatedQueue);
      localStorage.setItem('solowipe_sms_queue', JSON.stringify(updatedQueue));
      openSMSForJob(nextJob, nextIndex, smsQueue.jobIds);
    }
  };

  const handleCancelSMSQueue = () => {
    setSmsQueue(null);
    setShowNextSMS(false);
    localStorage.removeItem('solowipe_sms_queue');
  };

  const clearBulkSelection = () => {
    if (onToggleSelect) {
      selectedJobIds.forEach(id => onToggleSelect(id)); // Clear all selections
    }
    setBulkAssignmentMode(false);
    setBulkReminderMode(false);
    if (onBulkRescheduleToggle) {
      onBulkRescheduleToggle(); // Exit bulk reschedule mode if active
    }
  };

  if (originalTotal === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      <Collapsible open={isExpanded} onOpenChange={handleToggleExpand}>
        {/* Section Header */}
        <div className="flex flex-col gap-3 mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 mb-6 hover:opacity-80 transition-opacity duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" strokeWidth={2.5} />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                Upcoming Jobs
              </h2>
              <span 
                className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground border border-border/50 shrink-0"
                aria-label={`${originalTotal} upcoming ${originalTotal === 1 ? 'job' : 'jobs'}`}
              >
                {originalTotal > 99 ? '99+' : originalTotal}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>

          {/* Search Bar - shown when expanded */}
          {isExpanded && originalTotal > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="upcoming-jobs-search-input"
                name="upcoming-jobs-search"
                type="text"
                placeholder="Search by customer name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted-foreground/20 transition-colors touch-sm min-h-[32px] min-w-[32px] flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Search Results Count */}
          {isExpanded && searchQuery && (
            <p className="text-sm text-muted-foreground">
              {totalUpcoming === 0 
                ? 'No jobs found' 
                : `Found ${totalUpcoming} job${totalUpcoming !== 1 ? 's' : ''}`
              }
            </p>
          )}
        </div>

        <CollapsibleContent className="space-y-6">
          {/* Action Bar */}
          {isExpanded && (
            <div className="mb-6 flex items-center gap-3 flex-wrap justify-end">
              {!bulkMode && !bulkAssignmentMode && !bulkReminderMode ? (
                <>
                  {isOwner && onBulkAssign && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setBulkAssignmentMode(true)}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      <UserCheck className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                      <span className="hidden sm:inline">Bulk Assign</span>
                      <span className="sm:hidden">Assign</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setBulkReminderMode(true)}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Bulk Reminder</span>
                    <span className="sm:hidden">Remind</span>
                  </Button>
                  {onBulkRescheduleToggle && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={onBulkRescheduleToggle}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      <Calendar className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                      <span className="hidden sm:inline">Bulk Reschedule</span>
                      <span className="sm:hidden">Reschedule</span>
                    </Button>
                  )}
                </>
              ) : bulkAssignmentMode ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {onSelectAll && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={onSelectAll}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      Select All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={clearBulkSelection}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                    Cancel
                  </Button>
                  <Button
                    size="default"
                    onClick={() => setBulkAssignmentModalOpen(true)}
                    disabled={selectedJobIds.size === 0}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <UserCheck className="w-4 h-4" strokeWidth={2.5} />
                    Assign ({selectedJobIds.size})
                  </Button>
                </div>
              ) : bulkReminderMode ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {onSelectAll && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={onSelectAll}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      Select All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={clearBulkSelection}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                    Cancel
                  </Button>
                  <Button
                    size="default"
                    onClick={handleBulkReminder}
                    disabled={selectedJobIds.size === 0}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
                    Send Reminders ({selectedJobIds.size})
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {onSelectAll && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={onSelectAll}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      Select All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={onBulkRescheduleToggle}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                    Cancel
                  </Button>
                  {onBulkReschedule && (
                    <Button
                      size="default"
                      onClick={onBulkReschedule}
                      disabled={selectedJobIds.size === 0}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                    >
                      <Calendar className="w-4 h-4" strokeWidth={2.5} />
                      Reschedule ({selectedJobIds.size})
                  </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bulk mode header */}
          {isExpanded && (bulkMode || bulkAssignmentMode || bulkReminderMode) && selectedJobIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {Array.from(selectedJobIds).filter(id => jobs.some(j => j.id === id)).length} of {originalTotal} job{originalTotal !== 1 ? 's' : ''} selected
                </span>
              </div>
            </motion.div>
          )}

          {/* SMS Queue Indicator */}
          {isExpanded && showNextSMS && smsQueue && (
            <div className="mb-6 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-xl shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {smsQueue.index + 1} of {smsQueue.jobIds.length} sent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ready for next reminder?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleNextSMS}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Next
                  </Button>
                  <Button
                    onClick={handleCancelSMSQueue}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Jobs Content */}
          <div className="space-y-6">
          <AnimatePresence>
            {totalUpcoming === 0 && searchQuery ? (
              <motion.div
                key="empty-search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center"
              >
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No jobs found matching "{searchQuery}"</p>
              </motion.div>
            ) : (
              <>
                {/* Tomorrow */}
                {groupedJobs.tomorrow.length > 0 && (
                  <JobGroup 
                    title="Tomorrow" 
                    jobs={groupedJobs.tomorrow} 
                    onJobClick={onJobClick} 
                    businessName={businessName}
                    bulkMode={bulkMode || bulkAssignmentMode || bulkReminderMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}

                {/* This Week */}
                {groupedJobs.thisWeek.length > 0 && (
                  <JobGroup 
                    title="This Week" 
                    jobs={groupedJobs.thisWeek} 
                    onJobClick={onJobClick} 
                    businessName={businessName}
                    bulkMode={bulkMode || bulkAssignmentMode || bulkReminderMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}

                {/* Later */}
                {groupedJobs.later.length > 0 && (
                  <JobGroup 
                    title="Later" 
                    jobs={groupedJobs.later} 
                    onJobClick={onJobClick} 
                    businessName={businessName}
                    bulkMode={bulkMode || bulkAssignmentMode || bulkReminderMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}
              </>
            )}
          </AnimatePresence>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk Assignment Modal */}
      {onBulkAssign && (
        <BulkAssignmentModal
          isOpen={bulkAssignmentModalOpen}
          onClose={() => setBulkAssignmentModalOpen(false)}
          selectedJobIds={selectedJobIds}
          jobs={jobs.filter(job => selectedJobIds.has(job.id))}
          onAssign={handleBulkAssign}
          helpers={helpers}
          currentUserId={currentUserId}
        />
      )}
    </motion.div>
  );
}

interface JobGroupProps {
  title: string;
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
}

function JobGroup({ 
  title, 
  jobs, 
  onJobClick, 
  businessName = 'SoloWipe',
  bulkMode = false,
  selectedJobIds = new Set(),
  onToggleSelect,
}: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2" role="list" aria-label={`${title} jobs`}>
        {jobs.map((job) => (
          <UpcomingJobCard 
            key={job.id} 
            job={job} 
            onClick={onJobClick} 
            businessName={businessName}
            bulkMode={bulkMode}
            isSelected={selectedJobIds.has(job.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
}

function UpcomingJobCard({ 
  job, 
  onClick, 
  businessName = 'SoloWipe',
  bulkMode = false,
  isSelected = false,
  onToggleSelect,
}: UpcomingJobCardProps) {
  const formattedDate = formatJobDate(job.scheduled_date);

  const handleToggleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(job.id);
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
        "border border-border overflow-hidden flex-shrink-0",
        bulkMode && isSelected && "border-primary border-2"
      )}
      role="listitem"
    >
      {bulkMode && (
        <button
          onClick={handleToggleSelect}
          className="flex-shrink-0 p-3 transition-colors"
          aria-label={isSelected ? `Deselect ${customerName}` : `Select ${customerName}`}
        >
          {isSelected ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-muted-foreground" />
          )}
        </button>
      )}
      <button
        onClick={() => {
          if (bulkMode) {
            onToggleSelect?.(job.id);
          } else {
            onClick?.(job);
          }
        }}
        className={cn(
          "flex-1 flex items-center justify-between text-left p-4",
          "hover:bg-muted transition-colors overflow-hidden",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "touch-target"
        )}
        aria-label={bulkMode 
          ? `${isSelected ? 'Deselect' : 'Select'} ${customerName} - ${customerAddress} on ${formattedDate}`
          : `View details for ${customerName} - ${customerAddress} on ${formattedDate}`
        }
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

      {/* 
        UPCOMING JOB CARD ACTIONS
        
        Available Actions:
        - Text: Contact customer about future job
        - Skip: Skip future job (advance scheduling decision)
        - Click card: Opens reschedule modal (individual reschedule)
        
        Actions NOT Available:
        - Complete: Future jobs cannot be completed (only today's jobs)
        
        Why these actions? Upcoming jobs are for future planning:
        - Text: Communicate with customers about upcoming work
        - Skip: Make advance scheduling decisions
        - Reschedule: Adjust future dates (via card click)
        
        Complete action is intentionally excluded because completion
        is only meaningful for today's active execution workflow.
      */}
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
      </div>
    </motion.div>
  );
}
