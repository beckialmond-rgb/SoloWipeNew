import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Clock, ChevronDown, CheckCircle, SkipForward, UserCheck, Calendar as CalendarIcon, X, Sparkles, UserPlus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { JobWithCustomer, JobWithCustomerAndAssignment } from '@/types/database';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { OptimizeRouteButton } from '@/components/OptimizeRouteButton';
import { BulkRescheduleModal } from '@/components/BulkRescheduleModal';
import { BulkAssignmentModal } from '@/components/BulkAssignmentModal';
import { JobAssignmentPicker } from '@/components/JobAssignmentPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TodaySectionProps {
  jobs: JobWithCustomerAndAssignment[];
  businessName?: string;
  isOwner: boolean;
  isHelper: boolean;
  customers: Array<{ id: string }>;
  assignedJobs: JobWithCustomerAndAssignment[];
  showWelcome: boolean;
  onComplete: (job: JobWithCustomer) => void;
  onAssignClick: (job: JobWithCustomerAndAssignment) => void;
  onAssign: (jobId: string, userId: string) => Promise<void>;
  onAssignMultiple: (jobId: string, userIds: string[]) => Promise<void>;
  onUnassign: (jobId: string, userId?: string) => Promise<void>;
  onReschedule: (job: JobWithCustomer) => void;
  onBulkReschedule: (jobIds: string[], newDate: Date) => Promise<void>;
  onBulkAssign: (jobIds: string[], userId: string) => Promise<void>;
  onReorder: (jobs: JobWithCustomerAndAssignment[]) => void;
  onQuickAdd: () => void;
  completingJobId: string | null;
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

export function TodaySection({
  jobs,
  businessName = 'SoloWipe',
  isOwner,
  isHelper,
  customers,
  assignedJobs,
  showWelcome,
  onComplete,
  onAssignClick,
  onAssign,
  onAssignMultiple,
  onUnassign,
  onReschedule,
  onBulkReschedule,
  onBulkAssign,
  onReorder,
  onQuickAdd,
  completingJobId,
  helpers,
  currentUserId,
  isLoadingHelpers,
  onCreateHelper,
  onRemoveHelper,
  onInviteSent,
}: TodaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [bulkRescheduleMode, setBulkRescheduleMode] = useState(false);
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkRescheduleModalOpen, setBulkRescheduleModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);
  const [bulkCompleteConfirmOpen, setBulkCompleteConfirmOpen] = useState(false);
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<JobWithCustomerAndAssignment | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Automatically include overdue jobs (scheduled_date < today)
  const todayJobs = useMemo(() => {
    return jobs.filter(job => job.scheduled_date <= today);
  }, [jobs, today]);

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
    setSelectedJobIds(new Set(todayJobs.map(j => j.id)));
  };

  const clearBulkSelection = () => {
    setSelectedJobIds(new Set());
    setBulkRescheduleMode(false);
    setBulkAssignmentMode(false);
  };

  const handleBulkReschedule = async (newDate: Date) => {
    if (selectedJobIds.size === 0) return;
    const jobIdsArray = Array.from(selectedJobIds);
    await onBulkReschedule(jobIdsArray, newDate);
    clearBulkSelection();
  };

  const handleBulkAssign = async (userId: string) => {
    if (selectedJobIds.size === 0) return;
    const jobIdsArray = Array.from(selectedJobIds);
    await onBulkAssign(jobIdsArray, userId);
    setBulkAssignmentModalOpen(false);
    clearBulkSelection();
  };

  const handleBulkComplete = async () => {
    if (selectedJobIds.size === 0 || isBulkCompleting) return;
    
    setIsBulkCompleting(true);
    setBulkCompleteConfirmOpen(false);
    
    try {
      const jobIdsArray = Array.from(selectedJobIds);
      // Complete jobs sequentially
      for (const jobId of jobIdsArray) {
        const job = todayJobs.find(j => j.id === jobId);
        if (job) {
          await onComplete(job);
        }
      }
      clearBulkSelection();
    } catch (error) {
      console.error('Bulk complete error:', error);
    } finally {
      setIsBulkCompleting(false);
    }
  };

  const handleJobAssignClick = (job: JobWithCustomerAndAssignment) => {
    setSelectedJobForAssignment(job);
    setAssignmentPickerOpen(true);
  };

  // Use all jobs for display in bulk mode, otherwise use todayJobs
  const jobsToShow = (bulkRescheduleMode || bulkAssignmentMode) ? jobs : todayJobs;
  const canUseBulkMode = true; // Always available for today section

  // Empty states
  if (todayJobs.length === 0 && (isOwner ? customers.length > 0 : assignedJobs.length === 0) && !showWelcome) {
    if (isHelper && !isOwner && assignedJobs.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <EmptyState
            title="Waiting for job assignments"
            description="Your owner will assign jobs to you here. You'll see them automatically when they're assigned, and you'll get notifications too."
            icon={<UserCheck className="w-8 h-8 text-primary" />}
          />
        </motion.div>
      );
    }

    if (isOwner && customers.length === 0 && !showWelcome) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="text-center py-12">
            <Button
              onClick={onQuickAdd}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add Your First Customer
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <EmptyState
          title="All done for today!"
          description="Great work! You've completed all your scheduled jobs."
          icon={<Sparkles className="w-8 h-8 text-accent" />}
        />
      </motion.div>
    );
  }

  if (todayJobs.length === 0) {
    return null; // Don't show section if no jobs
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Section Header */}
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 mb-6 hover:opacity-80 transition-opacity duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
              Scheduled Today
            </h2>
            <span 
              className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground border border-border/50 shrink-0"
              aria-label={`${todayJobs.length} job${todayJobs.length !== 1 ? 's' : ''} scheduled today`}
            >
              {todayJobs.length > 99 ? '99+' : todayJobs.length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-6">
          {/* Action Bar */}
          {isExpanded && (
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              {!bulkRescheduleMode && !bulkAssignmentMode ? (
                <>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setBulkAssignmentMode(true)}
                      disabled={completingJobId !== null}
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
                    disabled={completingJobId !== null}
                    className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Bulk Reschedule</span>
                    <span className="sm:hidden">Reschedule</span>
                  </Button>
                </>
              ) : bulkAssignmentMode ? (
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
                    onClick={() => setBulkAssignmentModalOpen(true)}
                    disabled={selectedJobIds.size === 0}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <UserCheck className="w-4 h-4" strokeWidth={2.5} />
                    Assign Helper ({selectedJobIds.size})
                  </Button>
                </div>
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
                    onClick={() => setBulkCompleteConfirmOpen(true)}
                    disabled={selectedJobIds.size === 0 || isBulkCompleting}
                    className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out"
                  >
                    <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                    Complete ({selectedJobIds.size})
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

          {/* Route optimization */}
          {isExpanded && todayJobs.length >= 2 && (
            <div className="mb-6">
              <OptimizeRouteButton jobs={todayJobs} onReorder={onReorder} />
            </div>
          )}

          {/* Bulk mode header */}
          {isExpanded && (bulkRescheduleMode || bulkAssignmentMode) && selectedJobIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {selectedJobIds.size} of {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </motion.div>
          )}

          {/* Jobs List - Drag to reorder (disabled in bulk mode) */}
          <Reorder.Group
            axis="y"
            values={((bulkRescheduleMode || bulkAssignmentMode) && canUseBulkMode) ? [] : jobsToShow}
            onReorder={((bulkRescheduleMode || bulkAssignmentMode) && canUseBulkMode) ? () => {} : onReorder}
            className="space-y-4 md:space-y-6"
          >
            <AnimatePresence mode="popLayout">
              {jobsToShow.map((job, index) => {
                const isSelected = selectedJobIds.has(job.id);
                const jobWithAssignment: JobWithCustomerAndAssignment = {
                  ...job,
                  assignment: ('assignment' in job && job.assignment) ? (job as JobWithCustomerAndAssignment).assignment : undefined,
                  assignments: ('assignments' in job && job.assignments) ? (job as JobWithCustomerAndAssignment).assignments : []
                };
                // Calculate overdue status
                const isOverdue = job.scheduled_date < today;
                const daysOverdue = isOverdue 
                  ? differenceInDays(new Date(today), new Date(job.scheduled_date))
                  : 0;
                return (
                  <div key={job.id} className="flex items-center gap-3">
                    {((bulkRescheduleMode || bulkAssignmentMode) && canUseBulkMode) && (
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
                    <div className="flex-1">
                      <JobCard
                        job={jobWithAssignment}
                        businessName={businessName}
                        onComplete={onComplete}
                        index={index}
                        isNextUp={index === 0}
                        onAssignClick={isOwner ? handleJobAssignClick : undefined}
                        showAssignment={isOwner}
                        isOverdue={isOverdue}
                        daysOverdue={daysOverdue}
                      />
                    </div>
                  </div>
                );
              })}
            </AnimatePresence>
          </Reorder.Group>
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

      <BulkAssignmentModal
        isOpen={bulkAssignmentModalOpen}
        onClose={() => setBulkAssignmentModalOpen(false)}
        selectedJobIds={selectedJobIds}
        jobs={todayJobs.filter(job => selectedJobIds.has(job.id))}
        onAssign={handleBulkAssign}
        helpers={helpers}
        currentUserId={currentUserId}
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

      <AlertDialog open={bulkCompleteConfirmOpen} onOpenChange={setBulkCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} as completed using their default prices. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkComplete} disabled={isBulkCompleting}>
              {isBulkCompleting ? 'Completing...' : 'Complete Jobs'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

