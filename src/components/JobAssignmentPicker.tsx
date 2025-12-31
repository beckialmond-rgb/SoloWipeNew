import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Check, AlertCircle, Loader2, Save, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelperList } from './HelperList';
import { JobWithCustomerAndAssignment } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { useRole } from '@/hooks/useRole';
import { useAssignmentTemplates } from '@/hooks/useAssignmentTemplates';
import { TemplateNameDialog } from './TemplateNameDialog';

interface Helper {
  id: string;
  email: string;
  name?: string;
  initials: string;
  isPlaceholder?: boolean; // True if helper hasn't signed up yet
  hasPendingInvite?: boolean; // True if invite sent but not accepted
  inviteExpiresAt?: string | null; // When invite expires
}

interface JobAssignmentPickerProps {
  job: JobWithCustomerAndAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (jobId: string, userId: string) => Promise<void>;
  onAssignMultiple?: (jobId: string, userIds: string[]) => Promise<void>;
  onUnassign: (jobId: string, userId?: string) => Promise<void>;
  onCreateHelper?: (name: string, email?: string) => Promise<Helper>;
  onRemoveHelper?: (helperId: string) => Promise<void>;
  onInviteSent?: () => void; // Callback when invite is sent (to refresh list)
  helpers: Helper[];
  currentUserId?: string;
  isLoadingHelpers?: boolean;
  onApplyTemplate?: (templateId: string) => Promise<void>; // For bulk assignment template application
  selectedJobIds?: Set<string>; // For bulk assignment (to know how many jobs)
}

export function JobAssignmentPicker({
  job,
  isOpen,
  onClose,
  onAssign,
  onAssignMultiple,
  onUnassign,
  onCreateHelper,
  onRemoveHelper,
  onInviteSent,
  helpers,
  currentUserId,
  isLoadingHelpers = false,
  onApplyTemplate,
  selectedJobIds,
}: JobAssignmentPickerProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedHelperIds, setSelectedHelperIds] = useState<Set<string>>(new Set());
  const [recentlyCreatedHelperIds, setRecentlyCreatedHelperIds] = useState<Set<string>>(new Set());
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isOwner } = useRole();
  const { templates, isLoading: templatesLoading, createTemplate, applyTemplate, isCreating, isApplying } = useAssignmentTemplates();
  const isAssigningRef = useRef(false); // Prevent double-clicks
  const jobIdRef = useRef<string | null>(null); // Track job ID to prevent stale assignments
  const isBulkAssignment = job?.id === 'bulk-assignment';

  // Detect placeholder helpers in selection
  const selectedHelpers = helpers.filter(h => selectedHelperIds.has(h.id));
  const placeholderHelpers = selectedHelpers.filter(h => 
    h.isPlaceholder || h.email.endsWith('@temp.helper')
  );
  const realHelpers = selectedHelpers.filter(h => 
    !placeholderHelpers.includes(h)
  );

  const canAssign = selectedHelperIds.size > 0 && placeholderHelpers.length === 0;
  const hasPlaceholders = placeholderHelpers.length > 0;
  const hasRealHelpers = realHelpers.length > 0;
  const allSelectedArePlaceholders = hasPlaceholders && realHelpers.length === 0;

  // Initialize selected helpers from current assignments
  useEffect(() => {
    if (job && isOpen) {
      const assignments = job.assignments || (job.assignment ? [job.assignment] : []);
      const assignedIds = new Set(assignments.map(a => a.assigned_to_user_id));
      setSelectedHelperIds(assignedIds);
      // Only update jobIdRef if not currently assigning (to prevent race condition with query invalidation)
      // Use only the ref check since state updates are async
      if (!isAssigningRef.current) {
        jobIdRef.current = job.id; // Track current job ID
      }
    } else if (!isOpen) {
      // Reset state when modal closes
      setSelectedHelperIds(new Set());
      setAssignmentSuccess(false);
      isAssigningRef.current = false;
      jobIdRef.current = null;
    }
  }, [job, isOpen]);

  const handleToggleHelper = (helperId: string) => {
    setSelectedHelperIds(prev => {
      const next = new Set(prev);
      if (next.has(helperId)) {
        next.delete(helperId);
      } else {
        next.add(helperId);
      }
      return next;
    });
  };

  const handleCreateHelper = async (name: string, email?: string): Promise<Helper> => {
    if (!onCreateHelper) {
      throw new Error('Create helper not available');
    }
    
    try {
      const newHelper = await onCreateHelper(name, email);
      // Track recently created helper for better UX
      setRecentlyCreatedHelperIds(prev => new Set(prev).add(newHelper.id));
      // Clear after 5 seconds (helper is no longer "recent")
      setTimeout(() => {
        setRecentlyCreatedHelperIds(prev => {
          const next = new Set(prev);
          next.delete(newHelper.id);
          return next;
        });
      }, 5000);
      
      toast({
        title: 'Helper added',
        description: `${name} has been added to your team. They'll need to sign up before you can assign jobs.`,
      });
      return newHelper;
    } catch (error) {
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Adding helper',
        entity: 'helper'
      });
      toast({
        title: 'Failed to add helper',
        description: friendlyError,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleAssignSelected = async () => {
    // Prevent double-clicks and ensure job is still valid
    if (!job || isAssigning || isAssigningRef.current || selectedHelperIds.size === 0) return;
    
    // Capture job ID FIRST before any async operations
    const currentJobId = job.id;
    
    // Verify job hasn't changed
    if (jobIdRef.current && jobIdRef.current !== currentJobId) {
      toast({
        title: 'Job changed',
        description: 'The job has changed. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Filter out placeholder helpers - only assign to real helpers
    const selectedHelpersList = helpers.filter(h => selectedHelperIds.has(h.id));
    const realHelperIds = selectedHelpersList
      .filter(h => !h.isPlaceholder && !h.email.endsWith('@temp.helper'))
      .map(h => h.id);

    // If only placeholders selected, show helpful message
    if (realHelperIds.length === 0) {
      const placeholderNames = selectedHelpersList
        .filter(h => h.isPlaceholder || h.email.endsWith('@temp.helper'))
        .map(h => h.name || 'Helper')
        .join(', ');
      
      toast({
        title: 'Helpers need to sign up first',
        description: `${placeholderNames} ${selectedHelpersList.length === 1 ? 'needs' : 'need'} to create an account before receiving job assignments. They're already added to your team!`,
        variant: 'destructive',
      });
      return;
    }

    // Lock the refs BEFORE any state updates to prevent race conditions
    isAssigningRef.current = true;
    jobIdRef.current = currentJobId; // Lock the jobIdRef to prevent it from being updated during assignment
    setIsAssigning(true);
    
    try {
      if (onAssignMultiple && realHelperIds.length > 1) {
        await onAssignMultiple(currentJobId, realHelperIds);
        
        // Verify job hasn't changed during assignment
        // Check if job prop changed to a different job ID (not just a new reference)
        if (job && job.id !== currentJobId) {
          console.warn('[JobAssignmentPicker] Job ID changed during assignment:', { 
            expected: currentJobId, 
            actual: job.id,
            refValue: jobIdRef.current 
          });
          throw new Error('Job was modified during assignment. Please refresh and try again.');
        }
        
        // Show success with info about skipped placeholders
        if (hasPlaceholders) {
          toast({
            title: 'Job assigned',
            description: `Assigned to ${realHelperIds.length} helper${realHelperIds.length !== 1 ? 's' : ''}. ${placeholderHelpers.length} helper${placeholderHelpers.length !== 1 ? 's' : ''} skipped (need to sign up first).`,
          });
        } else {
          toast({
            title: 'Job assigned',
            description: `Assigned to ${realHelperIds.length} helper${realHelperIds.length !== 1 ? 's' : ''}.`,
          });
        }
      } else {
        await onAssign(currentJobId, realHelperIds[0]);
        
        // Verify job hasn't changed during assignment
        // Check if job prop changed to a different job ID (not just a new reference)
        if (job && job.id !== currentJobId) {
          console.warn('[JobAssignmentPicker] Job ID changed during assignment:', { 
            expected: currentJobId, 
            actual: job.id,
            refValue: jobIdRef.current 
          });
          throw new Error('Job was modified during assignment. Please refresh and try again.');
        }
        
        toast({
          title: 'Job assigned',
          description: 'The job has been assigned successfully.',
        });
      }
      
      // Show success animation before closing
      setAssignmentSuccess(true);
      setTimeout(() => {
        if (jobIdRef.current === currentJobId) {
          onClose();
        }
        setAssignmentSuccess(false);
      }, 800);
    } catch (error) {
      console.error('[JobAssignmentPicker] Assignment error:', {
        error,
        currentJobId,
        jobIdRef: jobIdRef.current,
        jobId: job?.id,
        realHelperIds,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Assigning job',
        entity: 'assignment'
      });
      toast({
        title: 'Failed to assign job',
        description: friendlyError,
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
      isAssigningRef.current = false;
    }
  };

  const handleUnassign = async (userId?: string) => {
    if (!job || isAssigning || isAssigningRef.current) return;
    
    // Capture job ID FIRST before any async operations
    const currentJobId = job.id;
    
    // Verify job hasn't changed
    if (jobIdRef.current && jobIdRef.current !== currentJobId) {
      toast({
        title: 'Job changed',
        description: 'The job has changed. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Lock the refs BEFORE any state updates to prevent race conditions
    isAssigningRef.current = true;
    jobIdRef.current = currentJobId; // Lock the jobIdRef to prevent it from being updated during unassignment
    setIsAssigning(true);
    
    try {
      await onUnassign(currentJobId, userId);
      
      // Verify job hasn't changed during unassignment
      // Check if job prop changed to a different job ID (not just a new reference)
      if (job && job.id !== currentJobId) {
        console.warn('[JobAssignmentPicker] Job ID changed during unassignment:', { 
          expected: currentJobId, 
          actual: job.id,
          refValue: jobIdRef.current 
        });
        throw new Error('Job was modified during unassignment. Please refresh and try again.');
      }
      
      if (userId) {
        // Remove from selected if unassigning specific user
        setSelectedHelperIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        // Clear all if unassigning all
        setSelectedHelperIds(new Set());
      }
      toast({
        title: 'Job unassigned',
        description: userId ? 'The assignment has been removed.' : 'All assignments have been removed.',
      });
      // Don't close on unassign - allow user to reassign
    } catch (error) {
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Unassigning job',
        entity: 'assignment'
      });
      toast({
        title: 'Failed to unassign job',
        description: friendlyError,
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
      isAssigningRef.current = false;
    }
  };

  const handleAssignToMe = async () => {
    if (!job || !currentUserId || isAssigning || isAssigningRef.current) return;
    
    // Capture job ID FIRST before any async operations
    const currentJobId = job.id;
    
    // Verify job hasn't changed
    if (jobIdRef.current && jobIdRef.current !== currentJobId) {
      toast({
        title: 'Job changed',
        description: 'The job has changed. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    // Lock the refs BEFORE any state updates to prevent race conditions
    isAssigningRef.current = true;
    jobIdRef.current = currentJobId; // Lock the jobIdRef to prevent it from being updated during assignment
    setIsAssigning(true);
    
    try {
      await onAssign(currentJobId, currentUserId);
      
      // Verify job hasn't changed during assignment
      // Check if job prop changed to a different job ID (not just a new reference)
      if (job && job.id !== currentJobId) {
        console.warn('[JobAssignmentPicker] Job ID changed during assignment:', { 
          expected: currentJobId, 
          actual: job.id,
          refValue: jobIdRef.current 
        });
        throw new Error('Job was modified during assignment. Please refresh and try again.');
      }
      
      // Add current user to selection after successful assignment
      setSelectedHelperIds(prev => new Set(prev).add(currentUserId));
      
      toast({
        title: 'Job assigned',
        description: 'The job has been assigned to you.',
      });
      
      // Show success animation before closing
      setAssignmentSuccess(true);
      setTimeout(() => {
        if (jobIdRef.current === currentJobId) {
          onClose();
        }
        setAssignmentSuccess(false);
      }, 800);
    } catch (error) {
      const friendlyError = getUserFriendlyError(error, { 
        operation: 'Assigning job to yourself',
        entity: 'assignment'
      });
      toast({
        title: 'Failed to assign job',
        description: friendlyError,
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
      isAssigningRef.current = false;
    }
  };

  const assignments = job?.assignments || (job?.assignment ? [job.assignment] : []);
  const assignedIds = new Set(assignments.map(a => a.assigned_to_user_id));
  
  // Check if selection has changed (more robust comparison)
  const hasChanges = job ? (
    selectedHelperIds.size !== assignedIds.size ||
    !Array.from(selectedHelperIds).every(id => assignedIds.has(id)) ||
    !Array.from(assignedIds).every(id => selectedHelperIds.has(id))
  ) : false;

  const handleOpenChange = (open: boolean) => {
    if (!open && !isAssigning) {
      onClose();
    }
  };

  const handleSaveAsTemplate = async (name: string) => {
    // Filter out placeholder helpers - only save real helpers
    const realHelperIds = Array.from(selectedHelperIds).filter(id => {
      const helper = helpers.find(h => h.id === id);
      return helper && !helper.isPlaceholder && !helper.email.endsWith('@temp.helper');
    });

    if (realHelperIds.length === 0) {
      toast({
        title: 'No helpers to save',
        description: 'Select at least one helper who has signed up to create a template.',
        variant: 'destructive',
      });
      return;
    }

    await createTemplate({ name, helperIds: realHelperIds });
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!onApplyTemplate) {
      // Fallback: apply template directly if no handler provided
      if (job && !isBulkAssignment) {
        // Single job assignment
        const template = templates.find(t => t.id === templateId);
        if (!template) {
          toast({
            title: 'Template not found',
            description: 'The selected template could not be found.',
            variant: 'destructive',
          });
          return;
        }
        
        if (onAssignMultiple && template.helper_ids.length > 0) {
          await onAssignMultiple(job.id, template.helper_ids);
        }
      } else if (isBulkAssignment && selectedJobIds) {
        // Bulk assignment - use applyTemplate mutation
        await applyTemplate({ templateId, jobIds: Array.from(selectedJobIds) });
        onClose();
      }
    } else {
      // Use provided handler (for BulkAssignmentModal)
      await onApplyTemplate(templateId);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] flex flex-col"
        data-testid="job-assignment-picker"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking overlay during assignment
          if (isAssigning) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing during assignment
          if (isAssigning) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5" />
            Assign Job
          </DialogTitle>
          <DialogDescription className="text-foreground">
            {isBulkAssignment && selectedJobIds
              ? `Assign ${selectedJobIds.size} job${selectedJobIds.size !== 1 ? 's' : ''} to helper${selectedHelperIds.size !== 1 ? 's' : ''}.`
              : selectedHelperIds.size > 0 
              ? `Select helper${selectedHelperIds.size !== 1 ? 's' : ''} for this job. ${selectedHelperIds.size} selected.`
              : "Select one or more helpers, or type a name to add someone new."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="mt-4 relative min-h-[200px] z-10">
          {job && job.customer ? (
            <>
              {/* Template dropdown for bulk assignments */}
              {isOwner && isBulkAssignment && templates.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Apply Template
                  </label>
                  <Select
                    onValueChange={handleApplyTemplate}
                    disabled={isApplying || isAssigning}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{template.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              ({template.helper_ids.length} helper{template.helper_ids.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isApplying && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Applying template...
                    </p>
                  )}
                </div>
              )}

              {/* Job info */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="font-medium text-foreground">{job.customer?.name || 'Unknown Customer'}</div>
                <div className="text-sm text-muted-foreground">{job.customer?.address || 'No address'}</div>
                {!isBulkAssignment && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Scheduled: {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date'}
                  </div>
                )}
              </div>

              {/* Status banner when placeholders selected */}
              {hasPlaceholders && (
                <div className="mb-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-foreground mb-1">
                        {placeholderHelpers.length} helper{placeholderHelpers.length !== 1 ? 's' : ''} need to sign up
                      </div>
                      <div className="text-muted-foreground">
                        {placeholderHelpers.map(h => h.name || 'Helper').join(', ')} {placeholderHelpers.length === 1 ? 'needs' : 'need'} to create an account before receiving job assignments. Once they sign up, you can assign jobs immediately.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Helper list */}
              {isLoadingHelpers ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading helpers...</p>
                </div>
              ) : (
                <HelperList
                  helpers={helpers}
                  currentAssignments={assignments}
                  selectedHelperIds={selectedHelperIds}
                  onToggleHelper={handleToggleHelper}
                  onUnassign={handleUnassign}
                  onAssignToMe={handleAssignToMe}
                  onCreateHelper={onCreateHelper ? handleCreateHelper : undefined}
                  onRemoveHelper={onRemoveHelper}
                  onInviteSent={onInviteSent}
                  currentUserId={currentUserId}
                  isLoading={isAssigning}
                  recentlyCreatedHelperIds={recentlyCreatedHelperIds}
                />
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading job details...</p>
              <p className="text-xs mt-2 text-muted-foreground/70">
                If this persists, try closing and reopening the assignment picker.
              </p>
            </div>
          )}
          </div>

          {/* Loading overlay during assignment */}
          {isAssigning && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border border-border shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Assigning job...</p>
                <p className="text-xs text-muted-foreground">Please wait</p>
              </div>
            </div>
          )}

          {/* Success animation overlay */}
          {assignmentSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
            >
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border border-primary/20 shadow-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-primary" />
                </motion.div>
                <p className="text-sm font-medium text-foreground">Job assigned successfully!</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        {job && (
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            {assignments.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => handleUnassign()}
                disabled={isAssigning}
                className="text-destructive hover:text-destructive"
              >
                Unassign All
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {isOwner && selectedHelperIds.size > 0 && realHelpers.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setTemplateNameDialogOpen(true)}
                  disabled={isAssigning || isCreating}
                  title="Save current helper selection as a template"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              {hasChanges && (
                <Button
                  onClick={handleAssignSelected}
                  disabled={isAssigning || allSelectedArePlaceholders || isAssigningRef.current}
                  title={
                    isAssigning || isAssigningRef.current
                      ? 'Assignment in progress...'
                      : allSelectedArePlaceholders
                      ? `${placeholderHelpers.map(h => h.name || 'Helper').join(', ')} need${placeholderHelpers.length === 1 ? 's' : ''} to sign up first`
                      : hasPlaceholders && hasRealHelpers
                      ? `Will assign to ${realHelpers.length} helper${realHelpers.length !== 1 ? 's' : ''} (${placeholderHelpers.length} skipped)`
                      : undefined
                  }
                >
                  {isAssigning || isAssigningRef.current ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : allSelectedArePlaceholders ? (
                    'Helpers Need to Sign Up'
                  ) : hasPlaceholders && hasRealHelpers ? (
                    `Assign to ${realHelpers.length} Helper${realHelpers.length !== 1 ? 's' : ''}`
                  ) : selectedHelperIds.size === 0 ? (
                    'Assign'
                  ) : (
                    `Assign to ${selectedHelperIds.size} Helper${selectedHelperIds.size !== 1 ? 's' : ''}`
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Template Name Dialog */}
    <TemplateNameDialog
      isOpen={templateNameDialogOpen}
      onClose={() => setTemplateNameDialogOpen(false)}
      onSave={handleSaveAsTemplate}
      isLoading={isCreating}
    />
    </>
  );
}
