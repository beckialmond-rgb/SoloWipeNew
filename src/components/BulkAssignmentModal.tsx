import { JobAssignmentPicker } from './JobAssignmentPicker';
import { JobWithCustomerAndAssignment } from '@/types/database';
import { useAssignmentTemplates } from '@/hooks/useAssignmentTemplates';

interface BulkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJobIds: Set<string>;
  jobs: JobWithCustomerAndAssignment[];
  onAssign: (jobId: string, userId: string) => Promise<void>;
  helpers: Array<{ id: string; email: string; name?: string; initials: string }>;
  currentUserId?: string;
}

/**
 * Bulk assignment modal component (Phase 5)
 * Wraps JobAssignmentPicker to handle bulk assignment of multiple jobs
 * Enhanced with template support (Phase 7)
 */
export function BulkAssignmentModal({
  isOpen,
  onClose,
  selectedJobIds,
  jobs,
  onAssign,
  helpers,
  currentUserId,
}: BulkAssignmentModalProps) {
  const selectedJobs = jobs.filter(j => selectedJobIds.has(j.id));
  const { applyTemplate } = useAssignmentTemplates();
  
  // Create a "virtual" job for the picker (shows count)
  const virtualJob: JobWithCustomerAndAssignment = {
    id: 'bulk-assignment',
    customer_id: '',
    scheduled_date: '',
    status: 'pending',
    created_at: new Date().toISOString(),
    customer: {
      id: '',
      name: `${selectedJobs.length} job${selectedJobs.length !== 1 ? 's' : ''}`,
      address: 'Multiple locations',
      profile_id: '',
      price: 0,
      frequency_weeks: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    },
  };

  const handleAssign = async (jobId: string, userId: string) => {
    if (jobId === 'bulk-assignment') {
      // Assign all selected jobs
      await Promise.all(
        Array.from(selectedJobIds).map(id => onAssign(id, userId))
      );
      onClose();
    } else {
      await onAssign(jobId, userId);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    await applyTemplate({ templateId, jobIds: Array.from(selectedJobIds) });
    onClose();
  };

  return (
    <JobAssignmentPicker
      job={virtualJob}
      isOpen={isOpen}
      onClose={onClose}
      onAssign={handleAssign}
      helpers={helpers}
      currentUserId={currentUserId}
      onApplyTemplate={handleApplyTemplate}
      selectedJobIds={selectedJobIds}
    />
  );
}

