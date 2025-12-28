import { useState, useEffect } from 'react';
import { UserPlus, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { JobWithCustomerAndAssignment } from '@/types/database';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface JobAssignmentAvatarProps {
  job: JobWithCustomerAndAssignment;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

interface HelperInfo {
  userId: string;
  email: string;
  name: string | null;
  initials: string;
}

export function JobAssignmentAvatar({ job, onClick, size = 'md' }: JobAssignmentAvatarProps) {
  // Support both old assignment (singular) and new assignments (plural)
  const assignments = job.assignments || (job.assignment ? [job.assignment] : []);
  const [helperInfos, setHelperInfos] = useState<HelperInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch helper info from team_members for all assignments
  // Memoize assignment IDs to prevent unnecessary re-fetches
  const assignmentIds = assignments.map(a => a.assigned_to_user_id).join(',');
  
  useEffect(() => {
    if (assignments.length === 0) {
      setHelperInfos([]);
      return;
    }
    
    const fetchHelperInfos = async () => {
      setIsLoading(true);
      try {
        const userIds = assignments.map(a => a.assigned_to_user_id);
        
        // Batch fetch all helper info in one query
        const { data, error } = await supabase
          .from('team_members')
          .select('helper_id, helper_email, helper_name')
          .in('helper_id', userIds);
        
        if (error) {
          throw error;
        }
        
        const infos: HelperInfo[] = assignments.map(assignment => {
          const teamMember = data?.find(tm => tm.helper_id === assignment.assigned_to_user_id);
          const email = teamMember?.helper_email || assignment.assigned_to_user_id.slice(0, 8) + '...';
          const name = teamMember?.helper_name || null;
          
          // Get initials
          let initials = '?';
          if (name) {
            initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          } else if (email && email !== assignment.assigned_to_user_id.slice(0, 8) + '...') {
            initials = email.split('@')[0].slice(0, 2).toUpperCase();
          } else {
            initials = assignment.assigned_to_user_id.slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '') || '?';
          }
          
          return {
            userId: assignment.assigned_to_user_id,
            email,
            name,
            initials
          };
        });
        
        setHelperInfos(infos);
      } catch (error) {
        console.warn('[JobAssignmentAvatar] Failed to fetch helper info:', error);
        // Fallback: create basic info from assignments
        const infos: HelperInfo[] = assignments.map(assignment => ({
          userId: assignment.assigned_to_user_id,
          email: assignment.assigned_to_user_id.slice(0, 8) + '...',
          name: null,
          initials: assignment.assigned_to_user_id.slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '') || '?'
        }));
        setHelperInfos(infos);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHelperInfos();
  }, [assignmentIds]);
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // No assignments - show plus icon
  if (assignments.length === 0) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "rounded-full hover:bg-primary/10 hover:text-primary",
          sizeClasses[size],
          "p-0"
        )}
        aria-label="Assign job to helper"
        title="Assign job to helper"
      >
        <UserPlus className={cn("text-muted-foreground", iconSizes[size])} />
      </Button>
    );
  }

  // Single assignment - show single avatar
  if (assignments.length === 1) {
    const helper = helperInfos[0] || {
      userId: assignments[0].assigned_to_user_id,
      email: 'helper',
      name: null,
      initials: '?'
    };
    const helperLabel = helper.name || helper.email || 'helper';

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "rounded-full transition-all hover:ring-2 hover:ring-primary/50",
          sizeClasses[size]
        )}
        aria-label={`Assigned to ${helperLabel}. Click to manage assignments.`}
        title={`Assigned to ${helperLabel}`}
      >
        <Avatar className={cn("w-full h-full", sizeClasses[size])}>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {helper.initials}
          </AvatarFallback>
        </Avatar>
      </button>
    );
  }

  // Multiple assignments - show stacked avatars
  const visibleHelpers = helperInfos.slice(0, 3); // Show max 3
  const remainingCount = assignments.length - visibleHelpers.length;
  const totalLabel = `${assignments.length} helper${assignments.length !== 1 ? 's' : ''}`;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center -space-x-2 transition-all hover:space-x-0",
        "hover:ring-2 hover:ring-primary/50 rounded-full p-0.5"
      )}
      aria-label={`Assigned to ${totalLabel}. Click to manage assignments.`}
      title={`Assigned to ${totalLabel}`}
    >
      {visibleHelpers.map((helper, index) => (
        <Avatar
          key={helper.userId}
          className={cn(
            "border-2 border-background",
            sizeClasses[size],
            index > 0 && "z-10"
          )}
          style={{ zIndex: visibleHelpers.length - index }}
        >
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {helper.initials}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <Avatar className={cn("border-2 border-background bg-muted", sizeClasses[size])}>
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </button>
  );
}
