import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, MapPin, UserCheck, Calendar as CalendarIcon, MessageSquare, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { JobWithCustomer, JobWithCustomerAndAssignment } from '@/types/database';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { JobAssignmentAvatar } from '@/components/JobAssignmentAvatar';
import { TomorrowSMSButton } from '@/components/TomorrowSMSButton';
import { EmptyState } from '@/components/EmptyState';
import { BulkRescheduleModal } from '@/components/BulkRescheduleModal';
import { JobAssignmentPicker } from '@/components/JobAssignmentPicker';

interface TomorrowSectionProps {
  jobs: JobWithCustomer[];
  businessName?: string;
  isOwner: boolean;
  onAssignClick: (job: JobWithCustomerAndAssignment) => void;
  onAssign: (jobId: string, userId: string) => void;
  onAssignMultiple: (jobId: string, userIds: string[]) => void;
  onUnassign: (jobId: string, userId?: string) => void;
  onReschedule: (job: JobWithCustomer) => void;
  onBulkReschedule: (jobIds: string[], newDate: Date) => Promise<void>;
  onSendAllSMS: () => void;
  smsQueue?: { index: number; jobIds: string[] } | null;
  showNextSMS?: boolean;
  onNextSMS: () => void;
  onCancelSMSQueue: () => void;
  helpers: Array<{
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
}

export function TomorrowSection({
  jobs,
  businessName = 'SoloWipe',
  isOwner,
  onAssignClick,
  onAssign,
  onAssignMultiple,
  onUnassign,
  onReschedule,
  onBulkReschedule,
  onSendAllSMS,
  smsQueue,
  showNextSMS,
  onNextSMS,
  onCancelSMSQueue,
  helpers,
  currentUserId,
  isLoadingHelpers,
  onCreateHelper,
  onRemoveHelper,
  onInviteSent,
}: TomorrowSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('solowipe_tomorrow_jobs_hidden') !== 'true';
  });
  const [bulkRescheduleMode, setBulkRescheduleMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkRescheduleModalOpen, setBulkRescheduleModalOpen] = useState(false);
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<JobWithCustomerAndAssignment | null>(null);

  const handleToggleExpand = (open: boolean) => {
    setIsExpanded(open);
    if (open) {
      localStorage.removeItem('solowipe_tomorrow_jobs_hidden');
    } else {
      localStorage.setItem('solowipe_tomorrow_jobs_hidden', 'true');
    }
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const selectAllJobs = () => {
    setSelectedJobIds(new Set(jobs.map(j => j.id)));
  };

  const clearBulkSelection = () => {
    setSelectedJobIds(new Set());
    setBulkRescheduleMode(false);
  };

  const handleBulkReschedule = async (newDate: Date) => {
    if (selectedJobIds.size === 0) return;
    const jobIdsArray = Array.from(selectedJobIds);
    await onBulkReschedule(jobIdsArray, newDate);
    clearBulkSelection();
  };

  const handleJobAssignClick = (job: JobWithCustomerAndAssignment) => {
    setSelectedJobForAssignment(job);
    setAssignmentPickerOpen(true);
  };

  const jobsWithPhone = jobs.filter(job => job.customer?.mobile_phone);

  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
        className="mt-8"
      >
        <EmptyState
          title="No jobs scheduled tomorrow"
          description="You're all set for tomorrow!"
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="mt-8"
    >
      <Collapsible open={isExpanded} onOpenChange={handleToggleExpand}>
        {/* Section Header */}
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 mb-6 hover:opacity-80 transition-opacity duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
              Scheduled Tomorrow
            </h2>
            <span 
              className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground border border-border/50 shrink-0"
              aria-label={`${jobs.length} job${jobs.length !== 1 ? 's' : ''} scheduled tomorrow`}
            >
              {jobs.length > 99 ? '99+' : jobs.length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-6">
          {/* Action Bar */}
          {isExpanded && (
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              {!bulkRescheduleMode ? (
                <>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setBulkRescheduleMode(true)}
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
                    onClick={() => setBulkRescheduleMode(true)}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Bulk Reschedule</span>
                    <span className="sm:hidden">Reschedule</span>
                  </Button>
                  {jobsWithPhone.length > 1 && (
                    <Button
                      onClick={onSendAllSMS}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md"
                      disabled={!!smsQueue}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {smsQueue ? `Sending ${smsQueue.index + 1}/${smsQueue.jobIds.length}...` : 'Send All Reminders'}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={selectAllJobs}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    Select All
                  </Button>
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
                    onClick={() => setBulkRescheduleModalOpen(true)}
                    disabled={selectedJobIds.size === 0}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
                    Reschedule ({selectedJobIds.size})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bulk mode header */}
          {isExpanded && bulkRescheduleMode && selectedJobIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {selectedJobIds.size} of {jobs.length} job{jobs.length !== 1 ? 's' : ''} selected
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
                    onClick={onNextSMS}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Next
                  </Button>
                  <Button
                    onClick={onCancelSMSQueue}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Jobs List */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {jobs.map((job, index) => {
                const customerName = job.customer?.name || 'Customer';
                const isCurrentInQueue = smsQueue && smsQueue.jobIds[smsQueue.index] === job.id;
                const isSelected = selectedJobIds.has(job.id);
                const jobWithAssignment: JobWithCustomerAndAssignment = {
                  ...job,
                  assignment: ('assignment' in job && job.assignment) ? (job as JobWithCustomerAndAssignment).assignment : undefined,
                  assignments: ('assignments' in job && job.assignments) ? (job as JobWithCustomerAndAssignment).assignments : []
                };

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "bg-card rounded-xl border-2 border-border/60 dark:border-border/80 p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 ease-out",
                      isCurrentInQueue && "ring-2 ring-primary shadow-md",
                      bulkRescheduleMode && isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {bulkRescheduleMode && (
                        <button
                          onClick={() => toggleSelectJob(job.id)}
                          className="flex-shrink-0 transition-colors mt-2"
                        >
                          {isSelected ? (
                            <div className="w-6 h-6 rounded border-2 border-primary bg-primary flex items-center justify-center">
                              <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded border-2 border-muted-foreground" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <h3 className="font-semibold text-foreground text-base leading-tight truncate min-w-0">
                            {job.customer?.address || 'No address'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xl font-bold text-foreground">
                            £{job.customer?.price || 0}
                          </span>
                          <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                            {customerName}
                          </span>
                        </div>
                      </div>
                      
                      {/* Assignment and SMS buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Assignment Avatar - only show for owners */}
                        {isOwner && !bulkRescheduleMode && (
                          <JobAssignmentAvatar
                            job={jobWithAssignment}
                            onClick={() => handleJobAssignClick(jobWithAssignment)}
                            size="sm"
                          />
                        )}
                        
                        {/* SMS Button with tomorrow reminder template */}
                        {!bulkRescheduleMode && (
                          <TomorrowSMSButton
                            phoneNumber={job.customer?.mobile_phone}
                            customerName={customerName}
                            customerAddress={job.customer?.address || 'your address'}
                            jobPrice={job.customer?.price || 0}
                            scheduledDate={job.scheduled_date}
                            isGoCardlessActive={job.customer?.gocardless_mandate_status === 'active' && !!job.customer?.gocardless_id}
                            businessName={businessName}
                            iconOnly={true}
                            jobId={job.id}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modals */}
      <BulkRescheduleModal
        open={bulkRescheduleModalOpen}
        onOpenChange={setBulkRescheduleModalOpen}
        onReschedule={handleBulkReschedule}
        jobCount={selectedJobIds.size}
        jobs={jobs.filter(job => selectedJobIds.has(job.id))}
        businessName={businessName}
      />

      <JobAssignmentPicker
        job={selectedJobForAssignment}
        isOpen={assignmentPickerOpen}
        onClose={() => {
          setAssignmentPickerOpen(false);
          setSelectedJobForAssignment(null);
        }}
        onAssign={onAssign}
        onAssignMultiple={onAssignMultiple}
        onUnassign={onUnassign}
        onCreateHelper={onCreateHelper}
        onRemoveHelper={onRemoveHelper}
        onInviteSent={onInviteSent}
        helpers={helpers}
        currentUserId={currentUserId}
        isLoadingHelpers={isLoadingHelpers}
      />
    </motion.div>
  );
}

