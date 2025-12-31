import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer, JobWithCustomer, JobWithCustomerAndAssignment, JobAssignmentWithUser, TeamMember, Helper, ExpenseWithJob } from '@/types/database';
import { format, addWeeks, startOfWeek, subWeeks } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { mutationQueue, localData } from '@/lib/offlineStorage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { EARNINGS_WEEKS, PAID_JOBS_DAYS, UPCOMING_JOBS_WEEKS, QUERY_INVALIDATION_DELAY_MS, TOAST_DELAY_MS, DEFAULT_RETRY_DELAY_MS } from '@/constants/app';
import { getUserFriendlyError, getActionableError } from '@/lib/errorMessages';

// Helper function to validate session before critical operations
async function validateSession(userId: string | undefined): Promise<void> {
  if (!userId) return;
  
  // Check session first - only sign out if session is actually missing
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    const errorCode = sessionError.code || '';
    const errorMessage = sessionError.message?.toLowerCase() || '';
    
    // Only sign out on actual session missing errors
    if (errorCode === 'AuthSessionMissing' || 
        errorMessage.includes('session missing') ||
        errorMessage.includes('no session')) {
      console.warn('Session missing during validation, signing out');
      await supabase.auth.signOut();
      throw new Error('Your session has expired. Please sign in again.');
    }
    
    // Other session errors - don't sign out, just throw
    console.error('Session check error (non-critical):', sessionError);
    throw new Error('Failed to verify your session. Please try again.');
  }
  
  if (!session) {
    // No session - but don't sign out here, let the auth state handler deal with it
    throw new Error('No active session. Please sign in again.');
  }
  
  // Try to load profile, but don't sign out on failure
  // If profile fails to load, the app will show generic "Welcome" instead
  const { data: profileCheck, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    // Profile load failed - log but don't sign out
    // The app will show generic "Welcome" instead of business name
    console.warn('Profile check error (non-critical):', profileError);
    // Don't throw - allow operation to continue with generic welcome
    return;
  }

  if (!profileCheck) {
    // Profile doesn't exist - log but don't sign out
    // The app will show generic "Welcome" instead
    console.warn('Profile not found for user (non-critical)');
    // Don't throw - allow operation to continue with generic welcome
    return;
  }
}

export function useSupabaseData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const today = format(new Date(), 'yyyy-MM-dd');
  const fourWeeksFromNow = format(addWeeks(new Date(), UPCOMING_JOBS_WEEKS), 'yyyy-MM-dd');

  // Fetch customers (exclude archived customers)
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id) // SECURITY: Explicitly filter by user ID
        .eq('is_archived', false) // Filter out archived customers
        .order('name');
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  // Fetch profile for business name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch pending jobs for today (and overdue) - exclude jobs from archived customers
  // Includes assignment data for Owner view
  const { data: pendingJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['pendingJobs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*),
            assignments:job_assignments(
              id,
              assigned_to_user_id,
              assigned_by_user_id,
              assigned_at,
              created_at
            )
          `)
          .eq('status', 'pending')
          .is('cancelled_at', null)
          .lte('scheduled_date', today)
          .order('scheduled_date', { ascending: true });
        
        if (error) {
          console.error('[Pending Jobs Query Error]', error);
          throw error;
        }
        
        // Sort by scheduled_date ONLY - user wants jobs in date order
        // Remove order_index sorting to ensure pure date ordering
        const sortedData = (data || []).sort((a, b) => {
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        });
        
        const jobs = sortedData
          .map(job => {
            const assignments = (job.assignments && Array.isArray(job.assignments) 
              ? job.assignments 
              : []) as JobAssignmentWithUser[];
            
            return {
              ...job,
              customer: job.customer as Customer,
              assignments: assignments,
              // Backward compatibility: keep assignment as first assignment
              assignment: assignments.length > 0 ? assignments[0] : undefined
            };
          })
          .filter(job => {
            // CRITICAL: Exclude jobs from archived customers - must check both null and false
            // Also exclude scrubbed customers
            const customer = job.customer;
            if (!customer) return false; // No customer data = exclude
            if (customer.is_archived === true) return false; // Archived = exclude
            if (customer.is_scrubbed === true) return false; // Scrubbed = exclude
            return true; // Active customer = include
          }) as JobWithCustomerAndAssignment[];
        
        // Jobs loaded successfully
        return jobs;
      } catch (error) {
        console.error('[Pending Jobs Query] Failed to fetch pending jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Fetch completed jobs for today
  const { data: completedToday = [], isLoading: completedLoading } = useQuery({
    queryKey: ['completedToday', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('status', 'completed')
          .gte('completed_at', `${today}T00:00:00`)
          .order('completed_at', { ascending: false });
        
        if (error) {
          console.error('[Completed Today Query Error]', error);
          throw error;
        }
        
        const jobs = (data || []).map(job => ({
          ...job,
          customer: job.customer as Customer,
        })) as JobWithCustomer[];
        
        // Completed jobs loaded successfully
        return jobs;
      } catch (error) {
        console.error('[Completed Today Query] Failed to fetch completed jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Fetch ALL upcoming jobs (all future dates, after today) - exclude jobs from archived customers
  // CRITICAL: No date limit - all future jobs must be visible to prevent jobs from disappearing
  const { data: upcomingJobs = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcomingJobs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*),
            assignments:job_assignments(
              id,
              assigned_to_user_id,
              assigned_by_user_id,
              assigned_at,
              created_at
            )
          `)
          .eq('status', 'pending')
          .is('cancelled_at', null)
          .gt('scheduled_date', today)
          .order('scheduled_date', { ascending: true }); // Sort by date in ascending order
        
        if (error) {
          console.error('[Upcoming Jobs Query Error]', error);
          throw error;
        }
        
        // Sort by scheduled_date ONLY - user wants jobs in date order
        // Remove order_index sorting to ensure pure date ordering
        const sortedData = (data || []).sort((a, b) => {
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        });
        
        const jobs = sortedData
          .map(job => {
            const assignments = (job.assignments && Array.isArray(job.assignments) 
              ? job.assignments 
              : []) as JobAssignmentWithUser[];
            
            return {
              ...job,
              customer: job.customer as Customer,
              assignments: assignments,
              // Backward compatibility: keep assignment as first assignment
              assignment: assignments.length > 0 ? assignments[0] : undefined
            };
          })
          .filter(job => {
            // CRITICAL: Exclude jobs from archived customers - must check both null and false
            // Also exclude scrubbed customers
            const customer = job.customer;
            if (!customer) return false; // No customer data = exclude
            if (customer.is_archived === true) return false; // Archived = exclude
            if (customer.is_scrubbed === true) return false; // Scrubbed = exclude
            return true; // Active customer = include
          }) as JobWithCustomerAndAssignment[];
        
        // Upcoming jobs loaded successfully - ALL future jobs are now visible (excluding archived customers)
        return jobs;
      } catch (error) {
        console.error('[Upcoming Jobs Query] Failed to fetch upcoming jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Fetch assigned jobs (for Helpers - jobs assigned to current user)
  const { data: assignedJobs = [], isLoading: assignedJobsLoading } = useQuery({
    queryKey: ['assignedJobs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // First get assignments for this user
        const { data: assignments, error: assignmentsError } = await supabase
          .from('job_assignments')
          .select('job_id')
          .eq('assigned_to_user_id', user.id);
        
        if (assignmentsError) {
          console.error('[Assigned Jobs Query Error - Assignments]', assignmentsError);
          throw assignmentsError;
        }
        
        if (!assignments || assignments.length === 0) {
          return [];
        }
        
      const jobIds = assignments.map(a => a.job_id);
      
      // Then fetch the jobs
      // NOTE: Only fetch PENDING jobs - completed jobs are removed from assignments
      // when they're completed (see completeJobMutation cleanup logic)
      // This ensures helpers only see active assignments, not completed ones
      // IMPORTANT: Show ALL assigned jobs regardless of scheduled_date so helpers can see future assignments
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          assignments:job_assignments(
            id,
            assigned_to_user_id,
            assigned_by_user_id,
            assigned_at,
            created_at
          )
        `)
        .in('id', jobIds)
        .eq('status', 'pending')  // Only pending jobs - assignments are cleaned up on completion
        .is('cancelled_at', null)
        // Removed .lte('scheduled_date', today) filter - helpers should see all assigned jobs including future ones
        .order('scheduled_date', { ascending: true });
        
        if (error) {
          console.error('[Assigned Jobs Query Error - Jobs]', error);
          throw error;
        }
        
        const jobs = (data || []).map(job => {
          const assignments = (job.assignments && Array.isArray(job.assignments) 
            ? job.assignments 
            : []) as JobAssignmentWithUser[];
          
          return {
            ...job,
            customer: job.customer as Customer,
            assignments: assignments,
            // Backward compatibility: keep assignment as first assignment
            assignment: assignments.length > 0 ? assignments[0] : undefined
          };
        }) as JobWithCustomerAndAssignment[];
        
        return jobs;
      } catch (error) {
        console.error('[Assigned Jobs Query] Failed to fetch assigned jobs:', error);
        // Return empty array instead of throwing to prevent infinite loading
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Check if current user is a helper (has team memberships)
  // This helps determine helper status even when no current assignments exist
  const { data: teamMemberships = [], isLoading: teamMembershipsLoading } = useQuery({
    queryKey: ['teamMemberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id')
          .eq('helper_id', user.id)
          .limit(1);
        
        if (error) {
          console.warn('[Team Memberships Query] Error:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.warn('[Team Memberships Query] Exception:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch helpers from two sources:
  // 1. Team members (proactively added by owner)
  // 2. Users who have received assignments (discovered helpers)
  const { data: helpers = [], isLoading: helpersLoading } = useQuery({
    queryKey: ['helpers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Source 1: Get team members (proactively added helpers)
        // Include invite tracking fields to show pending invite status
        const { data: teamMembers, error: teamError } = await supabase
          .from('team_members')
          .select('*, invite_token, invited_at, invite_expires_at, invite_accepted_at')
          .eq('owner_id', user.id);
        
        if (teamError) {
          console.error('[Helpers Query Error - Team Members]', teamError);
          // If table doesn't exist yet, continue with discovered helpers
        }
        
        // Source 2: Get discovered helpers (from assignments)
        const { data: allAssignments, error: assignmentsError } = await supabase
          .from('job_assignments')
          .select(`
            assigned_to_user_id,
            job_id,
            jobs(
              customer_id,
              customers(profile_id)
            )
          `);
        
        if (assignmentsError) {
          console.error('[Helpers Query Error - Assignments]', assignmentsError);
          // Continue with team members only if assignments fail
        }
        
        // Filter assignments where current user is the owner
        const myAssignments = (allAssignments || []).filter((assignment: any) => {
          const job = assignment.jobs;
          if (!job || !job.customers) return false;
          return job.customers.profile_id === user.id;
        });
        
        // Extract unique user IDs from assignments
        const discoveredHelperIds = Array.from(
          new Set(
            myAssignments
              .map((a: any) => a.assigned_to_user_id)
              .filter(Boolean)
          )
        ) as string[];
        
        // NEW: Check which helper_ids exist in profiles table (have signed up)
        // Get all unique helper_ids from team_members
        const allHelperIds = Array.from(
          new Set((teamMembers || []).map((m: TeamMember) => m.helper_id).filter(Boolean))
        ) as string[];
        
        // Check which ones exist in profiles (have signed up)
        let signedUpHelperIds: string[] = [];
        if (allHelperIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .in('id', allHelperIds);
            
          if (!profilesError && profiles) {
            signedUpHelperIds = profiles.map(p => p.id);
          } else if (profilesError) {
            console.error('[Helpers Query Error - Profiles]', profilesError);
            // Continue with discoveredHelperIds only if profiles query fails
          }
        }
        
        // Combine team members and discovered helpers
        const helperMap = new Map<string, Helper>();
        
        // Add team members first (they have better data)
        (teamMembers || []).forEach((member: TeamMember) => {
          const initials = member.helper_name
            ? member.helper_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : member.helper_email.split('@')[0].slice(0, 2).toUpperCase();
        
          // FIXED: Detect placeholder correctly
          // 1. If email ends with @temp.helper, definitely a placeholder
          // 2. If helper_id exists in profiles table, they've signed up (NOT a placeholder)
          // 3. If helper_id is in discoveredHelperIds, they've been assigned (also signed up)
          const isTempEmail = member.helper_email.endsWith('@temp.helper');
          const hasSignedUp = signedUpHelperIds.includes(member.helper_id) || 
                             discoveredHelperIds.includes(member.helper_id);
          const isPlaceholder = isTempEmail || !hasSignedUp;
          
          // Check for pending invite (has token, not expired, not accepted)
          const hasPendingInvite = !!member.invite_token && 
            !member.invite_accepted_at &&
            (!member.invite_expires_at || new Date(member.invite_expires_at) > new Date());
        
          helperMap.set(member.helper_id, {
            id: member.helper_id,
            email: member.helper_email,
            name: member.helper_name || undefined,
            initials,
            isTeamMember: true,
            isPlaceholder: isPlaceholder,
            hasPendingInvite: hasPendingInvite,
            inviteExpiresAt: member.invite_expires_at || null,
          });
        });
        
        // Add discovered helpers (only if not already in team members)
        // These are always real users (can't assign to placeholders)
        discoveredHelperIds.forEach(userId => {
          if (!helperMap.has(userId)) {
            const placeholderEmail = userId.slice(0, 8) + '...';
            helperMap.set(userId, {
              id: userId,
              email: placeholderEmail,
              initials: userId.slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '') || '?',
              isTeamMember: false,
              isPlaceholder: false, // Discovered helpers are always real users
            });
          }
        });
        
        return Array.from(helperMap.values());
      } catch (error) {
        console.error('[Helpers Query] Failed to fetch helpers:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch weekly earnings (last 8 weeks of completed jobs)
  const eightWeeksAgo = format(subWeeks(new Date(), EARNINGS_WEEKS), 'yyyy-MM-dd');
  
  const { data: weeklyEarningsData = [], isLoading: weeklyLoading } = useQuery({
    queryKey: ['weeklyEarnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'completed')
        .gte('completed_at', `${eightWeeksAgo}T00:00:00`)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Group jobs by week and calculate totals
  const weeklyEarnings = (() => {
    const weeks: { weekStart: Date; weekLabel: string; total: number; jobCount: number }[] = [];
    
    // Create last 8 weeks
    for (let i = 0; i < EARNINGS_WEEKS; i++) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      weeks.push({
        weekStart,
        weekLabel: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : format(weekStart, 'd MMM'),
        total: 0,
        jobCount: 0,
      });
    }
    
    // Assign jobs to weeks
    weeklyEarningsData.forEach(job => {
      if (!job.completed_at) return;
      const jobDate = new Date(job.completed_at);
      const jobWeekStart = startOfWeek(jobDate, { weekStartsOn: 1 });
      
      const week = weeks.find(w => 
        format(w.weekStart, 'yyyy-MM-dd') === format(jobWeekStart, 'yyyy-MM-dd')
      );
      
      if (week) {
        week.total += job.amount_collected || 0;
        week.jobCount += 1;
      }
    });
    
    return weeks;
  })();

  // Calculate today's earnings
  const todayEarnings = completedToday.reduce(
    (sum, job) => sum + (job.amount_collected || 0),
    0
  );

  // Fetch unpaid jobs (completed but not yet paid)
  // NOTE: Includes unpaid jobs from archived customers for financial reporting
  // Archived customers are hidden from customer list but their unpaid jobs still need to be collected
  const { data: unpaidJobs = [], isLoading: unpaidLoading } = useQuery({
    queryKey: ['unpaidJobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers!inner(*)
          `)
          .eq('status', 'completed')
          .in('payment_status', ['unpaid', 'processing']) // Include both unpaid and processing (GoCardless payments in progress)
          // NOTE: Removed customer.status filter - include archived customers' unpaid jobs for financial reporting
          .order('completed_at', { ascending: false });
        
        if (error) {
          console.error('[Unpaid Jobs Query Error]', error);
          throw error;
        }
        
        const jobs = (data || []).map(job => ({
          ...job,
          customer: job.customer as Customer,
        })) as JobWithCustomer[];
        
        // Unpaid jobs loaded successfully
        return jobs;
      } catch (error) {
        console.error('[Unpaid Jobs Query] Failed to fetch unpaid jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Fetch paid jobs this week
  const sevenDaysAgo = format(subWeeks(new Date(), 1), 'yyyy-MM-dd'); // Last 7 days (1 week)
  
  const { data: paidThisWeek = [], isLoading: paidLoading } = useQuery({
    queryKey: ['paidThisWeek', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('status', 'completed')
          .eq('payment_status', 'paid')
          .gte('payment_date', `${sevenDaysAgo}T00:00:00`)
          .order('payment_date', { ascending: false });
        
        if (error) {
          console.error('[Paid This Week Query Error]', error);
          throw error;
        }
        
        const jobs = (data || []).map(job => ({
          ...job,
          customer: job.customer as Customer,
        })) as JobWithCustomer[];
        
        // Paid jobs loaded successfully
        return jobs;
      } catch (error) {
        console.error('[Paid This Week Query] Failed to fetch paid jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Calculate total outstanding
  const totalOutstanding = unpaidJobs.reduce(
    (sum, job) => sum + (job.amount_collected || 0),
    0
  );

  // Fetch recently archived customers (within last 7 days)
  const sevenDaysAgoDate = format(subWeeks(new Date(), 1), 'yyyy-MM-dd');
  const { data: recentlyArchivedCustomers = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['recentlyArchived', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id) // SECURITY: Explicitly filter by user ID
        .eq('is_archived', true) // Only get archived customers
        .not('archived_at', 'is', null)
        .gte('archived_at', `${sevenDaysAgoDate}T00:00:00`)
        .order('archived_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  // Fetch all archived customers (for Archive tab)
  const { data: allArchivedCustomers = [], isLoading: allArchivedLoading } = useQuery({
    queryKey: ['allArchivedCustomers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id) // SECURITY: Explicitly filter by user ID
        .eq('is_archived', true) // Only get archived customers
        .order('archived_at', { ascending: false, nullsFirst: false });
      
      if (error) {
        console.error('[allArchivedCustomers] Query error:', error);
        throw error;
      }
      
      console.log('[allArchivedCustomers] Fetched', data?.length || 0, 'archived customers');
      return data as Customer[];
    },
    enabled: !!user,
  });

  // Complete job mutation with OFFLINE SUPPORT
  // Use React state for tracking to ensure proper re-renders and prevent race conditions
  const [completingJobIds, setCompletingJobIds] = useState<Set<string>>(new Set());

  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId, customAmount, photoUrl }: { jobId: string; customAmount?: number; photoUrl?: string }) => {
      // Check if already completing - use current state snapshot
      if (completingJobIds.has(jobId)) {
        throw new Error('Job completion already in progress');
      }
      
      // Mark as completing
      setCompletingJobIds(prev => new Set(prev).add(jobId));

      try {
        // Validate session before critical operation
        await validateSession(user?.id);

        // Check job completion limit BEFORE allowing completion
        // This is a defense-in-depth check (UI should also check, but this prevents bypass)
        if (user?.id) {
          const { data: usageCounter, error: usageError } = await supabase
            .from('usage_counters')
            .select('jobs_completed_count, free_jobs_limit')
            .eq('profile_id', user.id)
            .maybeSingle();
          
          if (!usageError && usageCounter) {
            const jobsCompleted = usageCounter.jobs_completed_count || 0;
            const freeJobsLimit = usageCounter.free_jobs_limit || 10;
            
            // Check subscription status - if not subscribed/trialing, enforce limit
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('id', user.id)
              .maybeSingle();
            
            const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
            
            if (!isSubscribed && jobsCompleted >= freeJobsLimit) {
              throw new Error('Job completion limit reached. Please upgrade to continue completing jobs.');
            }
          }
        }

        // Fetch job directly from database (works for both Owners and Helpers)
        // RLS ensures user can only access jobs they own or are assigned to
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('id', jobId)
          .single();
        
        if (jobError || !jobData) {
          throw new Error('Job not found or access denied');
        }
        
        const job = {
          ...jobData,
          customer: jobData.customer as Customer,
        } as JobWithCustomer;

        const now = new Date();
        const completedAt = now.toISOString();
        
        // Validate scheduled_date
        let scheduledDate: Date;
        try {
          scheduledDate = new Date(job.scheduled_date);
          if (isNaN(scheduledDate.getTime())) {
            throw new Error(`Invalid scheduled_date: ${job.scheduled_date}`);
          }
        } catch (dateError) {
          console.error(`[Reschedule Error] Invalid scheduled_date for customer "${job.customer.name}" (ID: ${job.customer_id}):`, job.scheduled_date, dateError);
          throw new Error(`Invalid scheduled date for job. Customer: ${job.customer.name}`);
        }
        
        // Prevent completing jobs scheduled for future dates
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0); // Set to start of today
        scheduledDate.setHours(0, 0, 0, 0); // Set to start of scheduled date for accurate comparison
        if (scheduledDate > todayDate) {
          throw new Error(`Cannot complete a job scheduled for the future. Scheduled date: ${format(scheduledDate, 'yyyy-MM-dd')}`);
        }

        // Check for frequency - if missing or null, treat as 'One-off' and don't reschedule
        const frequencyWeeks = job.customer.frequency_weeks;
        const shouldReschedule = frequencyWeeks != null && frequencyWeeks > 0;
        
        if (!shouldReschedule) {
          console.log(`[Reschedule] Customer "${job.customer.name}" has no frequency (${frequencyWeeks}), treating as One-off. No reschedule.`);
        }

        // Calculate next date only if rescheduling
        let nextDate: Date | null = null;
        let nextScheduledDate: string | null = null;
        
        if (shouldReschedule) {
          try {
            nextDate = addWeeks(scheduledDate, frequencyWeeks);
            nextScheduledDate = format(nextDate, 'yyyy-MM-dd');
            console.log(`[Reschedule] Customer "${job.customer.name}": ${format(scheduledDate, 'yyyy-MM-dd')} + ${frequencyWeeks} weeks = ${nextScheduledDate}`);
          } catch (dateCalcError) {
            console.error(`[Reschedule Error] Failed to calculate next date for customer "${job.customer.name}" (ID: ${job.customer_id}):`, {
              scheduled_date: job.scheduled_date,
              frequency_weeks: frequencyWeeks,
              error: dateCalcError
            });
            // Don't fail the job completion, just skip rescheduling
            console.warn(`[Reschedule] Skipping reschedule for customer "${job.customer.name}" due to date calculation error`);
          }
        }

        // Check if customer has ACTIVE Direct Debit mandate (not just gocardless_id)
        const hasActiveMandate = job.customer.gocardless_mandate_status === 'active' && !!job.customer.gocardless_id;
        const isGoCardless = hasActiveMandate;
        const paymentStatus = isGoCardless ? 'processing' : 'unpaid';
        const paymentMethod = isGoCardless ? 'gocardless' : null;
        const paymentDate = null; // Only set when payment is paid_out (via webhook)
        const amountCollected = customAmount ?? job.customer.price;

        // If offline, queue the mutation and apply optimistic update
        if (!isOnline) {
          await mutationQueue.add({
            type: 'completeJob',
            payload: {
              jobId,
              customAmount,
              photoUrl,
              customerData: {
                customer_id: job.customer_id,
                frequency_weeks: frequencyWeeks ?? null,
                price: job.customer.price,
                gocardless_id: job.customer.gocardless_id,
                gocardless_mandate_status: job.customer.gocardless_mandate_status,
                scheduled_date: job.scheduled_date,
              },
            },
          });

          // Store optimistic data
          await localData.setOptimisticJob(jobId, {
            status: 'completed',
            completed_at: completedAt,
            amount_collected: amountCollected,
            payment_status: paymentStatus,
          });

          return {
            jobId,
            newJobId: shouldReschedule && nextDate ? `offline_${Date.now()}` : null,
            collectedAmount: amountCollected,
            nextDate: nextDate ? format(nextDate, 'dd MMM yyyy') : null,
            customerName: job.customer.name,
            offline: true,
          };
        }

        // Online: perform the actual mutation
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();
        
        if (currentJob?.status === 'completed') {
          throw new Error('Job already completed');
        }

        // Increment usage counter BEFORE job completion to ensure it happens
        // This prevents unlimited usage if counter increment fails
        const { data: usageData, error: usageError } = await supabase
          .rpc('increment_job_completion', { p_profile_id: user.id });
        
        if (usageError) {
          console.error('[Complete Job] Failed to increment job counter:', usageError);
          throw new Error('Failed to record job completion. Please try again.');
        }
        
        if (usageData && usageData[0]?.limit_reached) {
          console.log('[Complete Job] Job completion limit reached');
          // Limit reached - will trigger modal on next render via useUsageCounters hook
        }

        // Calculate helper payment amount (revenue split)
        // Only calculate if completer is a helper assigned to this job
        let helperPaymentAmount: number | null = null;
        
        try {
          // Check if completer is a helper (assigned to this job)
          // Note: We check BEFORE cleanup to see if user was assigned
          const { data: assignmentCheck } = await supabase
            .from('job_assignments')
            .select('assigned_to_user_id')
            .eq('job_id', jobId)
            .eq('assigned_to_user_id', user.id)
            .maybeSingle();
          
          const isHelperCompleter = !!assignmentCheck;
          
          if (isHelperCompleter) {
            // CRITICAL: Null check for customer.profile_id before accessing
            if (!job.customer?.profile_id) {
              console.error('[Revenue Split] Customer profile_id is null - cannot calculate helper payment', {
                jobId,
                customerId: job.customer_id,
                customerName: job.customer?.name,
              });
              // Continue with helperPaymentAmount = null (no payment)
            } else {
              // Fetch commission percentage from team_members
              // Need: owner_id (from customer.profile_id) and helper_id (user.id)
              const { data: teamMember, error: teamMemberError } = await supabase
                .from('team_members')
                .select('commission_percentage')
                .eq('owner_id', job.customer.profile_id)
                .eq('helper_id', user.id)
                .maybeSingle();
              
              if (teamMemberError) {
                console.error('[Revenue Split] Error fetching team member:', teamMemberError);
                // Continue with helperPaymentAmount = null (no payment)
              } else if (teamMember && teamMember.commission_percentage > 0) {
                // Validate commission percentage is within valid range (0-100)
                const commissionPercent = Math.max(0, Math.min(100, teamMember.commission_percentage));
                const commission = commissionPercent / 100;
                // Round to 2 decimal places using proper decimal arithmetic
                helperPaymentAmount = Math.round(amountCollected * commission * 100) / 100;
                console.log(`[Revenue Split] Helper payment calculated: £${amountCollected} × ${commissionPercent}% = £${helperPaymentAmount}`);
              } else {
                console.log('[Revenue Split] No commission set or commission is 0% - no helper payment');
              }
            }
          } else {
            console.log('[Revenue Split] Owner completed job - no helper payment');
          }
        } catch (revenueSplitError) {
          // Non-critical: log error but don't fail job completion
          console.error('[Revenue Split] Failed to calculate helper payment:', revenueSplitError);
          // Continue with helperPaymentAmount = null (no payment)
        }

        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            completed_at: completedAt,
            amount_collected: amountCollected,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            payment_date: paymentDate,
            photo_url: photoUrl || null,
            helper_payment_amount: helperPaymentAmount,
          })
          .eq('id', jobId)
          .eq('status', 'pending');

        if (updateError) {
          // If job update fails after counter increment, we have inconsistent state
          // Log prominently but don't rollback counter (would require transaction)
          console.error('[Complete Job] CRITICAL: Job update failed after counter increment:', updateError);
          throw new Error('Failed to complete job. Counter was incremented - please contact support if this persists.');
        }

        // Clean up assignment - job is completed, assignment no longer needed
        // This prevents orphaned assignments and ensures helper's list updates correctly
        try {
          const { error: assignmentError } = await supabase
            .from('job_assignments')
            .delete()
            .eq('job_id', jobId);
          
          if (assignmentError) {
            // Non-critical - log but don't fail job completion
            console.warn('[Complete Job] Failed to cleanup assignment:', assignmentError);
          } else {
            // Invalidate assignedJobs query so helper's list updates immediately
            queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
          }
        } catch (assignmentError) {
          // Non-critical - log but don't fail job completion
          console.warn('[Complete Job] Exception during assignment cleanup:', assignmentError);
        }

        // If customer has Direct Debit, collect payment automatically
        let ddRequiresReconnect = false;
        let ddCollectionError: string | null = null;
        let ddRequiresNewMandate = false;
        
        if (isGoCardless) {
          try {
            const { data: collectData, error: collectError } = await supabase.functions.invoke('gocardless-collect-payment', {
              body: {
                jobId,
                customerId: job.customer_id,
                amount: amountCollected,
                description: `Service - ${job.customer.name}`,
              },
            });
            
            // Check for error in response data (non-2xx responses from Supabase functions)
            if (collectData?.error && !collectError) {
              const errorMessage = typeof collectData.error === 'string' ? collectData.error : 'Failed to collect payment';
              console.error('[DD] Payment collection failed (error in data):', errorMessage);
              ddCollectionError = errorMessage;
              
              // Check if reconnection is required
              if (collectData.requiresReconnect) {
                ddRequiresReconnect = true;
                console.warn('[DD] GoCardless connection expired - requires reconnect');
              }
              
              // Check if new mandate is required
              if (collectData.requiresNewMandate) {
                ddRequiresNewMandate = true;
                console.warn('[DD] Mandate is not active - requires new mandate setup');
              }
              
              // If payment collection fails, revert job status to unpaid
              // This ensures cleaner can retry or collect manually
              if (!collectData.success && !collectData.paymentId) {
                console.warn('[DD] Payment collection failed - reverting job to unpaid status');
                await supabase
                  .from('jobs')
                  .update({
                    payment_status: 'unpaid',
                    payment_method: null,
                    gocardless_payment_id: null,
                    gocardless_payment_status: null,
                  })
                  .eq('id', jobId);
              }
            } else if (collectError) {
              console.error('[DD] Payment collection failed (function error):', collectError);
              ddCollectionError = collectError instanceof Error ? collectError.message : 'Failed to collect payment';
              
              // Check if reconnection is required
              const errorBody = collectError as { context?: { body?: { requiresReconnect?: boolean; requiresNewMandate?: boolean; error?: string } } };
              if (errorBody?.context?.body?.requiresReconnect) {
                ddRequiresReconnect = true;
                console.warn('[DD] GoCardless connection expired - requires reconnect');
              }
              
              if (errorBody?.context?.body?.requiresNewMandate) {
                ddRequiresNewMandate = true;
                console.warn('[DD] Mandate is not active - requires new mandate setup');
              }
              
              // Revert job status to unpaid if payment collection failed
              await supabase
                .from('jobs')
                .update({
                  payment_status: 'unpaid',
                  payment_method: null,
                  gocardless_payment_id: null,
                  gocardless_payment_status: null,
                })
                .eq('id', jobId);
            } else if (!collectData?.success && !collectData?.paymentId) {
              // Payment collection returned but without success/paymentId
              console.warn('[DD] Payment collection response missing success/paymentId');
              ddCollectionError = 'Payment collection failed. Please try again.';
              
              // Revert job status to unpaid
              await supabase
                .from('jobs')
                .update({
                  payment_status: 'unpaid',
                  payment_method: null,
                  gocardless_payment_id: null,
                  gocardless_payment_status: null,
                })
                .eq('id', jobId);
            }
          } catch (ddError) {
            console.error('[DD] Payment collection exception:', ddError);
            ddCollectionError = ddError instanceof Error ? ddError.message : 'Failed to collect payment';
            
            // Revert job status to unpaid on exception
            try {
              await supabase
                .from('jobs')
                .update({
                  payment_status: 'unpaid',
                  payment_method: null,
                  gocardless_payment_id: null,
                  gocardless_payment_status: null,
                })
                .eq('id', jobId);
            } catch (revertError) {
              console.error('[DD] Failed to revert job status:', revertError);
            }
          }
        }
        
        // Store error info for user feedback (will be returned in result)
        const ddErrorInfo = ddCollectionError ? {
          error: ddCollectionError,
          requiresReconnect: ddRequiresReconnect,
          requiresNewMandate: ddRequiresNewMandate,
        } : null;

        // Only create next job if rescheduling is enabled and date calculation succeeded
        let newJobId: string | null = null;
        let nextDateFormatted: string | null = null;
        
        if (shouldReschedule && nextScheduledDate) {
          try {
            console.log(`[Reschedule] Creating next job for customer "${job.customer.name}" (ID: ${job.customer_id})`, {
              scheduled_date: nextScheduledDate,
              frequency_weeks: frequencyWeeks,
              base_date: format(scheduledDate, 'yyyy-MM-dd')
            });
            
            const { data: newJob, error: insertError } = await supabase
              .from('jobs')
              .insert({
                customer_id: job.customer_id,
                scheduled_date: nextScheduledDate,
                status: 'pending',
                order_index: null, // New jobs start with no order_index - will be set by route optimization
              })
              .select()
              .single();

            if (insertError) {
              console.error(`[Reschedule Error] Failed to create next job for customer "${job.customer.name}" (ID: ${job.customer_id}):`, {
                customer_id: job.customer_id,
                scheduled_date: nextScheduledDate,
                frequency_weeks: frequencyWeeks,
                error: insertError,
                errorDetails: JSON.stringify(insertError, null, 2)
              });
              throw insertError;
            }

            if (!newJob) {
              throw new Error('New job was not returned from insert');
            }

            newJobId = newJob.id;
            nextDateFormatted = nextDate ? format(nextDate, 'dd MMM yyyy') : null;
            console.log(`[Reschedule Success] Created next job ${newJobId} for customer "${job.customer.name}": ${nextScheduledDate}`, {
              newJobId,
              scheduled_date: newJob.scheduled_date,
              status: newJob.status
            });
          } catch (rescheduleError) {
            console.error(`[Reschedule Error] Failed to reschedule job for customer "${job.customer.name}" (ID: ${job.customer_id}):`, {
              jobId,
              customer_id: job.customer_id,
              customer_name: job.customer.name,
              scheduled_date: job.scheduled_date,
              frequency_weeks: frequencyWeeks,
              nextScheduledDate,
              error: rescheduleError,
              errorMessage: rescheduleError instanceof Error ? rescheduleError.message : String(rescheduleError),
              errorStack: rescheduleError instanceof Error ? rescheduleError.stack : undefined
            });
            // Don't fail the job completion if rescheduling fails - job is already marked complete
            // Just log the error and continue
          }
        } else {
          console.log(`[Reschedule] Skipping reschedule for customer "${job.customer.name}" - One-off job or invalid frequency`, {
            shouldReschedule,
            hasNextScheduledDate: !!nextScheduledDate,
            frequency_weeks: frequencyWeeks
          });
        }

        return {
          jobId,
          newJobId,
          collectedAmount: amountCollected,
          nextDate: nextDateFormatted,
          customerName: job.customer.name,
          isDirectDebit: isGoCardless,
          ddRequiresReconnect,
          ddError: ddErrorInfo,
        };
      } finally {
        // Clean up completion tracking
        setCompletingJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    onMutate: async ({ jobId, customAmount }) => {
      console.log(`[Complete Job] Starting optimistic update for job ${jobId}`);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['completedToday'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });

      // Snapshot previous values
      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousCompleted = queryClient.getQueryData(['completedToday', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);

      // Optimistically update the cache
      const job = pendingJobs.find(j => j.id === jobId);
      if (job) {
        const now = new Date();
        const completedJob: JobWithCustomer = {
          ...job,
          status: 'completed',
          completed_at: now.toISOString(),
          amount_collected: customAmount ?? job.customer.price,
          payment_status: job.customer.gocardless_id ? 'paid' : 'unpaid',
        };

        // Remove from pending
        queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) =>
          (old || []).filter(j => j.id !== jobId)
        );

        // Add to completed
        queryClient.setQueryData(['completedToday', user?.id, today], (old: JobWithCustomer[] | undefined) =>
          [completedJob, ...(old || [])]
        );
        
        console.log(`[Complete Job] Optimistically removed job ${jobId} from pending and added to completed`);
      } else {
        console.warn(`[Complete Job] Job ${jobId} not found in pendingJobs for optimistic update`);
      }

      return { previousPending, previousCompleted, previousUpcoming };
    },
    onError: (err, variables, context) => {
      console.error(`[Complete Job Error] Failed to complete job ${variables.jobId}:`, err);
      
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousCompleted) {
        queryClient.setQueryData(['completedToday', user?.id, today], context.previousCompleted);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
      
      console.log(`[Complete Job] Rolled back optimistic updates for job ${variables.jobId}`);
    },
    onSuccess: (data) => {
      console.log(`[Complete Job Success] Job ${data.jobId} completed successfully`, {
        newJobId: data.newJobId,
        nextDate: data.nextDate,
        customerName: data.customerName,
        offline: data.offline
      });
      
      if (!data?.offline) {
        // Invalidate all related queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
        queryClient.invalidateQueries({ queryKey: ['completedToday'] });
        queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
        queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
        queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
        queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
        
        // If a new job was created, optimistically add it to upcomingJobs
        if (data.newJobId && data.nextDate) {
          console.log(`[Complete Job] Adding new job ${data.newJobId} to upcomingJobs optimistically`);
          
          // Fetch the newly created job to add to cache
          (async () => {
            try {
              const { data: newJob, error } = await supabase
                .from('jobs')
                .select(`
                  *,
                  customer:customers(*)
                `)
                .eq('id', data.newJobId)
                .single();
              
              if (error) {
                console.error(`[Complete Job] Failed to fetch new job ${data.newJobId}:`, error);
                return;
              }
              
              if (newJob) {
                const jobWithCustomer = {
                  ...newJob,
                  customer: newJob.customer as Customer,
                } as JobWithCustomer;
                
                queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
                  const existing = old || [];
                  // Check if job already exists to avoid duplicates
                  if (existing.some(j => j.id === data.newJobId)) {
                    return existing;
                  }
                  // Add new job and sort by order_index or scheduled_date
                  const updated = [...existing, jobWithCustomer];
                  return updated.sort((a, b) => {
                    const aIndex = a.order_index ?? Infinity;
                    const bIndex = b.order_index ?? Infinity;
                    if (aIndex !== bIndex) {
                      return aIndex - bIndex;
                    }
                    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
                  });
                });
                
                console.log(`[Complete Job] Successfully added new job ${data.newJobId} to upcomingJobs cache`);
              }
            } catch (error: unknown) {
              console.error(`[Complete Job] Error fetching new job for cache update:`, error);
            }
          })();
        }
      }
      
      // Show warning if DD payment collection failed due to expired connection
      if (data?.ddRequiresReconnect) {
        toast({
          title: "Direct Debit collection failed",
          description: "Your GoCardless connection has expired. Please reconnect in Settings to collect payments automatically.",
          variant: "destructive",
        });
      }
    },
  });

  // Mark job as paid with OFFLINE SUPPORT
  // Use React state for tracking to ensure proper re-renders and prevent race conditions
  const [payingJobIds, setPayingJobIds] = useState<Set<string>>(new Set());

  const markJobPaidMutation = useMutation({
    mutationFn: async ({ jobId, method }: { jobId: string; method: 'cash' | 'transfer' }) => {
      // Check if already paying - use current state snapshot
      if (payingJobIds.has(jobId)) {
        throw new Error('Payment already in progress');
      }
      
      // Mark as paying
      setPayingJobIds(prev => new Set(prev).add(jobId));

      try {
        // Validate session before critical operation
        await validateSession(user?.id);

        const now = new Date().toISOString();

        // If offline, queue the mutation
        if (!isOnline) {
          await mutationQueue.add({
            type: 'markJobPaid',
            payload: { jobId, method },
          });

          await localData.setOptimisticJob(jobId, {
            payment_status: 'paid',
            payment_method: method,
            payment_date: now,
          });

          return { jobId, method, offline: true };
        }

        const { data: updatedRows, error } = await supabase
          .from('jobs')
          .update({
            payment_status: 'paid',
            payment_method: method,
            payment_date: now,
          })
          .eq('id', jobId)
          .eq('payment_status', 'unpaid')
          .select('id');

        if (error) throw error;
        if (!updatedRows || updatedRows.length === 0) throw new Error('Job already paid');
        
        return { jobId, method };
      } finally {
        // Clean up payment tracking
        setPayingJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    onMutate: async ({ jobId, method }) => {
      await queryClient.cancelQueries({ queryKey: ['unpaidJobs'] });
      await queryClient.cancelQueries({ queryKey: ['paidThisWeek'] });
      await queryClient.cancelQueries({ queryKey: ['completedToday'] });

      const previousUnpaid = queryClient.getQueryData(['unpaidJobs', user?.id]);
      const previousPaid = queryClient.getQueryData(['paidThisWeek', user?.id]);
      const previousCompletedToday = queryClient.getQueryData(['completedToday', user?.id, today]);

      const job = unpaidJobs.find(j => j.id === jobId);
      if (job) {
        const now = new Date().toISOString();
        const paidJob: JobWithCustomer = {
          ...job,
          payment_status: 'paid',
          payment_method: method,
          payment_date: now,
        };

        queryClient.setQueryData(['unpaidJobs', user?.id], (old: JobWithCustomer[] | undefined) =>
          (old || []).filter(j => j.id !== jobId)
        );

        queryClient.setQueryData(['paidThisWeek', user?.id], (old: JobWithCustomer[] | undefined) =>
          [paidJob, ...(old || [])]
        );

        // Update completedToday cache to reflect paid status immediately
        queryClient.setQueryData(['completedToday', user?.id, today], (old: JobWithCustomer[] | undefined) =>
          (old || []).map(j => j.id === jobId ? paidJob : j)
        );
      }

      return { previousUnpaid, previousPaid, previousCompletedToday };
    },
    onError: (err, variables, context) => {
      if (context?.previousUnpaid) {
        queryClient.setQueryData(['unpaidJobs', user?.id], context.previousUnpaid);
      }
      if (context?.previousPaid) {
        queryClient.setQueryData(['paidThisWeek', user?.id], context.previousPaid);
      }
      if (context?.previousCompletedToday) {
        queryClient.setQueryData(['completedToday', user?.id, today], context.previousCompletedToday);
      }
      const friendlyMessage = getUserFriendlyError(err, { operation: 'Mark job paid' });
      toast({
        title: 'Error',
        description: friendlyMessage,
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      if (!data?.offline) {
        queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
        queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
        queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
        queryClient.invalidateQueries({ queryKey: ['completedToday'] });
      }
    },
  });

  // Batch mark jobs as paid with OFFLINE SUPPORT
  // Use React state instead of ref for proper tracking
  const [batchPaymentInProgress, setBatchPaymentInProgress] = useState(false);

  const batchMarkPaidMutation = useMutation({
    mutationFn: async ({ jobIds, method }: { jobIds: string[]; method: 'cash' | 'transfer' }) => {
      if (batchPaymentInProgress) {
        throw new Error('Batch payment already in progress');
      }
      setBatchPaymentInProgress(true);

      try {
        // Validate session before critical operation
        await validateSession(user?.id);

        const now = new Date().toISOString();

        if (!isOnline) {
          await mutationQueue.add({
            type: 'batchMarkPaid',
            payload: { jobIds, method },
          });

          for (const jobId of jobIds) {
            await localData.setOptimisticJob(jobId, {
              payment_status: 'paid',
              payment_method: method,
              payment_date: now,
            });
          }

          return { count: jobIds.length, method, offline: true };
        }

        const { error } = await supabase
          .from('jobs')
          .update({
            payment_status: 'paid',
            payment_method: method,
            payment_date: now,
          })
          .in('id', jobIds)
          .eq('payment_status', 'unpaid');

        if (error) throw error;
        
        return { count: jobIds.length, method };
      } finally {
        setBatchPaymentInProgress(false);
      }
    },
    onMutate: async ({ jobIds, method }) => {
      await queryClient.cancelQueries({ queryKey: ['unpaidJobs'] });

      const previousUnpaid = queryClient.getQueryData(['unpaidJobs', user?.id]);

      queryClient.setQueryData(['unpaidJobs', user?.id], (old: JobWithCustomer[] | undefined) =>
        (old || []).filter(j => !jobIds.includes(j.id))
      );

      return { previousUnpaid };
    },
    onError: (err, variables, context) => {
      if (context?.previousUnpaid) {
        queryClient.setQueryData(['unpaidJobs', user?.id], context.previousUnpaid);
      }
      const friendlyMessage = getUserFriendlyError(err, { operation: 'Batch mark paid' });
      toast({
        title: 'Error',
        description: friendlyMessage,
        variant: 'destructive',
      });
    },
    onSuccess: (result) => {
      if (!result?.offline) {
        queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
        queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
        queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
      }
      toast({
        title: `${result.count} payments recorded!`,
        description: result.offline ? 'Will sync when online' : `Marked as ${result.method}`,
      });
    },
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      address: string;
      mobile_phone: string;
      price: number;
      frequency_weeks: number;
      first_clean_date: string;
      preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Validate session before critical operation
      await validateSession(user.id);

      try {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            profile_id: user.id,
            name: data.name,
            address: data.address,
            mobile_phone: data.mobile_phone || null,
            price: data.price,
            frequency_weeks: data.frequency_weeks,
            preferred_payment_method: data.preferred_payment_method || null,
            status: 'active',
            notes: data.notes || null,
          })
          .select()
          .single();

        if (customerError) {
          throw customerError;
        }

        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            customer_id: newCustomer.id,
            scheduled_date: data.first_clean_date,
            status: 'pending',
          });

        if (jobError) {
          throw jobError;
        }

        return newCustomer;
      } catch (error) {
        console.error('Error adding customer:', error);
        // Error will be handled by onError callback which shows toast
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      toast({
        title: 'Customer added!',
        description: 'First job scheduled.',
      });
    },
    onError: (error) => {
      // Error is already logged in mutationFn catch block
      // Show user-friendly error message
      const friendlyMessage = getUserFriendlyError(error, { operation: 'Add customer', entity: 'customer' });
      toast({
        title: 'Failed to add customer',
        description: friendlyMessage,
        variant: 'destructive',
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        name: string;
        address: string;
        mobile_phone: string | null;
        price: number;
        frequency_weeks: number;
        preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
        notes?: string | null;
      };
    }) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
      toast({
        title: 'Customer updated!',
      });
    },
    onError: (error) => {
      const friendlyMessage = getUserFriendlyError(error, { operation: 'Update customer', entity: 'customer' });
      toast({
        title: 'Error',
        description: friendlyMessage,
        variant: 'destructive',
      });
    },
  });

  // Archive customer - MINIMAL VERSION to prevent crashes
  const archiveCustomer = async (id: string): Promise<void> => {
    console.log("[archiveCustomer] START", id);
    
    if (!id) {
      console.error("[archiveCustomer] No ID provided");
      throw new Error('Customer ID is required');
    }
    
    try {
      console.log("[archiveCustomer] Updating database...");
      const { error, data } = await supabase
        .from('customers')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString() // Set archived_at timestamp
        })
        .eq('id', id)
        .select('name')
        .single();
      
      console.log("[archiveCustomer] Database response:", { error: !!error, hasData: !!data });
      
      if (error) {
        console.error("[archiveCustomer] Database error:", error);
        throw new Error(error.message || 'Failed to archive customer');
      }
      
      if (!data) {
        console.error("[archiveCustomer] No data returned");
        throw new Error('Customer not found');
      }
      
      console.log("[archiveCustomer] Database update successful:", data.name);
      
      // CRITICAL: Optimistically remove jobs from pendingJobs and upcomingJobs immediately
      // This ensures archived customers' jobs disappear instantly, not after query refetch
      try {
        // Remove jobs from pendingJobs cache
        queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
          if (!old) return old;
          // Filter out jobs from the archived customer
          return old.filter(job => job.customer_id !== id);
        });
        
        // Remove jobs from upcomingJobs cache
        queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
          if (!old) return old;
          // Filter out jobs from the archived customer
          return old.filter(job => job.customer_id !== id);
        });
        
        console.log("[archiveCustomer] Optimistic cache updates applied - jobs removed immediately");
      } catch (cacheError) {
        console.error("[archiveCustomer] Optimistic cache update failed:", cacheError);
        // Continue even if cache update fails - query invalidation will fix it
      }
      
      // Invalidate queries AFTER a delay to prevent render cascade
      setTimeout(() => {
        console.log("[archiveCustomer] Invalidating queries...");
        try {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
          queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
          queryClient.invalidateQueries({ queryKey: ['allArchivedCustomers'] });
          queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
          console.log("[archiveCustomer] Queries invalidated");
        } catch (invalidateError) {
          console.error("[archiveCustomer] Query invalidation failed:", invalidateError);
        }
      }, QUERY_INVALIDATION_DELAY_MS);
      
      // Toast is now shown by the caller (e.g., CustomerDetailModal) with undo functionality
      // This allows the caller to add custom actions like undo button
      
      console.log("[archiveCustomer] END SUCCESS");
    } catch (error) {
      console.error("[archiveCustomer] END ERROR:", error);
      
      // Show error toast after a delay
      setTimeout(() => {
        try {
          const friendlyMessage = getUserFriendlyError(error, { operation: 'Archive customer', entity: 'customer' });
          toast({
            title: 'Error',
            description: friendlyMessage,
            variant: 'destructive',
          });
        } catch (toastError) {
          console.error("[archiveCustomer] Error toast failed:", toastError);
        }
      }, 0);
      
      throw error;
    }
  };

  // Unarchive customer mutation
  const unarchiveCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      const { error: customerError } = await supabase
        .from('customers')
        .update({ is_archived: false, status: 'active', archived_at: null })
        .eq('id', id)
        .eq('profile_id', user.id) // SECURITY: Ensure user owns this customer
        .eq('is_archived', true); // Only unarchive customers that are archived

      if (customerError) throw customerError;

      const { error: jobsError } = await supabase
        .from('jobs')
        .update({ cancelled_at: null })
        .eq('customer_id', id)
        .eq('status', 'pending')
        .not('cancelled_at', 'is', null);

      if (jobsError) throw jobsError;
      
      const customer = recentlyArchivedCustomers.find(c => c.id === id);
      return { customerName: customer?.name || 'Customer' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
      queryClient.invalidateQueries({ queryKey: ['allArchivedCustomers'] });
      toast({
        title: 'Customer restored',
        description: `${result.customerName} and their pending jobs have been restored.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Privacy scrub (hard archive) customer mutation
  const scrubCustomerDataMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        if (!id) {
          throw new Error('Customer ID is required');
        }

        // Validate session before critical operation
        await validateSession(user.id);

        // Get customer name before scrubbing for toast message
        let customerName = 'Customer';
        try {
          const { data: customerData, error: fetchError } = await supabase
            .from('customers')
            .select('name')
            .eq('id', id)
            .eq('profile_id', user.id)
            .maybeSingle();
          
          if (!fetchError && customerData?.name) {
            customerName = customerData.name;
          }
        } catch (fetchErr) {
          console.warn('[scrubCustomerData] Could not fetch customer name:', fetchErr);
          // Continue with default name
        }

        // First, delete any pending jobs for this customer (non-blocking)
        try {
          const { error: jobsError } = await supabase
            .from('jobs')
            .delete()
            .eq('customer_id', id)
            .in('status', ['pending']);

          if (jobsError) {
            console.warn('[scrubCustomerData] Error deleting pending jobs (non-blocking):', jobsError);
            // Continue with scrub even if job deletion fails
          }
        } catch (jobsErr) {
          console.warn('[scrubCustomerData] Exception deleting jobs (non-blocking):', jobsErr);
          // Continue with scrub
        }

        // Base update data (without is_scrubbed)
        const baseUpdateData = {
          address: 'SCRUBBED',
          mobile_phone: null,
          notes: null,
          is_archived: true,
          archived_at: new Date().toISOString(),
          status: 'inactive',
          latitude: null,
          longitude: null,
          gocardless_id: null,
          gocardless_mandate_status: null,
        };

        // Try update with is_scrubbed first
        let updateError = null;
        try {
          const { error } = await supabase
            .from('customers')
            .update({ ...baseUpdateData, is_scrubbed: true })
            .eq('id', id)
            .eq('profile_id', user.id);

          updateError = error;
        } catch (updateErr) {
          updateError = updateErr as Error;
        }

        // If error is about missing column, retry without is_scrubbed
        if (updateError) {
          const errorMessage = updateError.message || '';
          const errorCode = (updateError as any).code || '';
          
          const isColumnError = errorCode === '42703' || 
                                errorMessage.includes('is_scrubbed') ||
                                errorMessage.includes('column "is_scrubbed" does not exist');

          if (isColumnError) {
            console.warn('[scrubCustomerData] is_scrubbed column not found, retrying without it');
            
            const { error: retryError } = await supabase
              .from('customers')
              .update(baseUpdateData)
              .eq('id', id)
              .eq('profile_id', user.id);

            if (retryError) {
              console.error('[scrubCustomerData] Retry without is_scrubbed failed:', retryError);
              throw new Error(`Failed to scrub customer: ${retryError.message}`);
            }
          } else {
            console.error('[scrubCustomerData] Update failed:', updateError);
            throw new Error(`Failed to scrub customer: ${errorMessage || 'Unknown error'}`);
          }
        }
        
        return { customerName };
      } catch (error) {
        console.error('[scrubCustomerData] Mutation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to scrub customer data';
        throw new Error(errorMessage);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
      queryClient.invalidateQueries({ queryKey: ['allArchivedCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      toast({
        title: 'Customer data scrubbed',
        description: `${result.customerName}'s contact details have been removed for privacy compliance. Their name will remain in financial records.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update business name mutation
  const updateBusinessNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user) throw new Error('Not authenticated');

      // Validate session before critical operation
      await validateSession(user.id);

      const { error } = await supabase
        .from('profiles')
        .update({ business_name: newName })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Business name updated!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update Google Review Link mutation
  const updateGoogleReviewLinkMutation = useMutation({
    mutationFn: async (link: string | null) => {
      if (!user) throw new Error('Not authenticated');

      // Validate session before critical operation
      await validateSession(user.id);

      const { error } = await supabase
        .from('profiles')
        .update({ google_review_link: link })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Google review link updated!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reschedule job mutation with OFFLINE SUPPORT
  const rescheduleJobMutation = useMutation({
    mutationFn: async ({ jobId, newDate }: { jobId: string; newDate: string }) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      if (!isOnline) {
        await mutationQueue.add({
          type: 'rescheduleJob',
          payload: { jobId, newDate },
        });

        await localData.setOptimisticJob(jobId, {
          scheduled_date: newDate,
        });

        return { offline: true };
      }

      const { error } = await supabase
        .from('jobs')
        .update({ scheduled_date: newDate })
        .eq('id', jobId);

      if (error) throw error;
    },
    onMutate: async ({ jobId, newDate }) => {
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });

      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);

      // Find the job to get customer info for sorting
      const job = pendingJobs.find(j => j.id === jobId) || upcomingJobs.find(j => j.id === jobId);

      // Update job in pendingJobs cache
      queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
        if (!old) return old;
        const updated = old.map(j => j.id === jobId ? { ...j, scheduled_date: newDate } : j);
        // Re-sort by order_index or scheduled_date
        return updated.sort((a, b) => {
          const aIndex = a.order_index ?? Infinity;
          const bIndex = b.order_index ?? Infinity;
          if (aIndex !== bIndex) {
            return aIndex - bIndex;
          }
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        });
      });

      // Update job in upcomingJobs cache and re-sort
      // CRITICAL: Job MUST remain visible after rescheduling - no date filtering
      // All future jobs must be visible to prevent jobs from disappearing forever
      queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
        if (!old) {
          // If upcomingJobs is empty, add the job if new date is in the future
          if (newDate > today) {
            return [{
              ...job,
              scheduled_date: newDate,
            }];
          }
          return [];
        }
        
        const jobIndex = old.findIndex(j => j.id === jobId);
        
        if (jobIndex === -1) {
          // Job not in upcomingJobs - add it if new date is in the future
          if (newDate > today) {
            const updated = [...old, {
              ...job,
              scheduled_date: newDate,
            }];
            // Sort by scheduled_date ONLY - pure date order
            return updated.sort((a, b) => {
              return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
            });
          }
          return old; // Job not in upcoming and new date is not in future
        }
        
        // Job is in upcomingJobs - update it and ensure it ALWAYS stays visible
        // No filtering - all future jobs must remain visible
        const updated = old.map(j => j.id === jobId ? { ...j, scheduled_date: newDate } : j);
        
        // Sort by scheduled_date ONLY - pure date order
        return updated.sort((a, b) => {
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        });
      });

      return { previousPending, previousUpcoming };
    },
    onError: (err, variables, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      if (!data?.offline) {
        // Find the job to get customer name for better toast message
        const job = pendingJobs.find(j => j.id === variables.jobId) || upcomingJobs.find(j => j.id === variables.jobId);
        const customerName = job?.customer?.name || 'Customer';
        const formattedDate = format(new Date(variables.newDate), 'dd MMM yyyy');
        
        // Invalidate to ensure fresh data, but optimistic update already handled it
        queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
        queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
        
        toast({
          title: 'Job rescheduled',
          description: `${customerName} moved to ${formattedDate}`,
        });
      } else {
        toast({
          title: 'Job rescheduled',
          description: 'Will sync when online',
        });
      }
    },
  });

  // Skip job mutation with OFFLINE SUPPORT
  const skipJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      const job = pendingJobs.find(j => j.id === jobId) || upcomingJobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      // Validate scheduled_date
      let scheduledDate: Date;
      try {
        scheduledDate = new Date(job.scheduled_date);
        if (isNaN(scheduledDate.getTime())) {
          throw new Error(`Invalid scheduled_date: ${job.scheduled_date}`);
        }
      } catch (dateError) {
        console.error(`[Skip Error] Invalid scheduled_date for job ${jobId}:`, job.scheduled_date, dateError);
        throw new Error(`Invalid scheduled date for job. Customer: ${job.customer.name}`);
      }

      // Check for frequency - if missing or null, default to 4 weeks
      const frequencyWeeks = job.customer.frequency_weeks ?? 4;
      
      const originalDate = job.scheduled_date;
      // Use scheduled_date as base (not "now") - add frequency to the scheduled date
      const nextDate = addWeeks(scheduledDate, frequencyWeeks);
      const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');

      if (!isOnline) {
        await mutationQueue.add({
          type: 'skipJob',
          payload: { jobId, newScheduledDate: nextScheduledDate },
        });

        await localData.setOptimisticJob(jobId, {
          scheduled_date: nextScheduledDate,
        });

        return {
          jobId,
          originalDate,
          nextDate: format(nextDate, 'dd MMM yyyy'),
          customerName: job.customer.name,
          offline: true,
        };
      }

      const { error } = await supabase
        .from('jobs')
        .update({ scheduled_date: nextScheduledDate })
        .eq('id', jobId);

      if (error) throw error;

      // Clean up assignment if it exists - skipped jobs shouldn't have assignments
      // (They'll be rescheduled, so assignment should be removed)
      try {
        const { error: assignmentError } = await supabase
          .from('job_assignments')
          .delete()
          .eq('job_id', jobId);
        
        if (assignmentError) {
          // Non-critical - log but don't fail skip operation
          console.warn('[Skip Job] Failed to cleanup assignment:', assignmentError);
        } else {
          // Invalidate assignedJobs query so helper's list updates
          queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
        }
      } catch (assignmentError) {
        // Non-critical - log but don't fail skip operation
        console.warn('[Skip Job] Exception during assignment cleanup:', assignmentError);
      }

      return {
        jobId,
        originalDate,
        nextDate: format(nextDate, 'dd MMM yyyy'),
        customerName: job.customer.name,
      };
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });

      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);

      // Find the job in either pending or upcoming to get its details
      const job = pendingJobs.find(j => j.id === jobId) || upcomingJobs.find(j => j.id === jobId);
      
      if (job) {
        // Calculate new scheduled date (same logic as mutationFn)
        const scheduledDate = new Date(job.scheduled_date);
        const frequencyWeeks = job.customer.frequency_weeks ?? 4;
        const nextDate = addWeeks(scheduledDate, frequencyWeeks);
        const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');

        // Remove job from pending (if it's there)
        queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) =>
          (old || []).filter(j => j.id !== jobId)
        );

        // Update job in upcomingJobs with new scheduled_date
        // CRITICAL: Job MUST remain visible after skipping - no date filtering
        // All future jobs must be visible to prevent jobs from disappearing forever
        queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) => {
          if (!old) {
            // If upcomingJobs is empty, add the job if new date is in the future
            if (nextScheduledDate > today) {
              return [{
                ...job,
                scheduled_date: nextScheduledDate,
              }];
            }
            return [];
          }
          
          const jobIndex = old.findIndex(j => j.id === jobId);
          
          if (jobIndex === -1) {
            // Job not in upcomingJobs - add it if new date is in the future
            if (nextScheduledDate > today) {
              const updated = [...old, {
                ...job,
                scheduled_date: nextScheduledDate,
              }];
              // Sort by scheduled_date ONLY - pure date order
              return updated.sort((a, b) => {
                return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
              });
            }
            return old; // Job not in upcoming and new date is not in future
          }
          
          // Job is in upcomingJobs - update it and ensure it ALWAYS stays visible
          // No filtering - all future jobs must remain visible
          const updated = [...old];
          updated[jobIndex] = {
            ...updated[jobIndex],
            scheduled_date: nextScheduledDate,
          };
          
          // Sort by scheduled_date ONLY - pure date order
          return updated.sort((a, b) => {
            return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
          });
        });
      } else {
        // Job not found in either list, just remove from pending to be safe
        queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomer[] | undefined) =>
          (old || []).filter(j => j.id !== jobId)
        );
      }

      return { previousPending, previousUpcoming };
    },
    onError: (err, variables, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (result) => {
      if (!result?.offline) {
        // The optimistic update already updated the UI correctly with the new date
        // Don't invalidate or refetch immediately - the optimistic update is correct
        // The job will stay visible with the new date until the next natural refetch
        // This prevents the job from disappearing during a refetch
      }
      toast({
        title: 'Job skipped',
        description: `${result.customerName} rescheduled to ${result.nextDate}`,
      });
    },
  });

  // Undo complete job mutation
  const undoCompleteJobMutation = useMutation({
    mutationFn: async ({ jobId, newJobId }: { jobId: string; newJobId: string }) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', newJobId);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'pending',
          completed_at: null,
          amount_collected: null,
          payment_status: 'unpaid',
          payment_method: null,
          payment_date: null,
        })
        .eq('id', jobId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      toast({
        title: 'Job completion undone',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Undo mark paid mutation
  const undoMarkPaidMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      const { error } = await supabase
        .from('jobs')
        .update({
          payment_status: 'unpaid',
          payment_method: null,
          payment_date: null,
        })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
      toast({
        title: 'Payment undone',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update job notes mutation with OFFLINE SUPPORT
  const updateJobNotesMutation = useMutation({
    mutationFn: async ({ jobId, notes }: { jobId: string; notes: string | null }) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      if (!isOnline) {
        await mutationQueue.add({
          type: 'updateJobNotes',
          payload: { jobId, notes },
        });

        await localData.setOptimisticJob(jobId, { notes });

        return { offline: true };
      }

      const { error } = await supabase
        .from('jobs')
        .update({ notes })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: (data) => {
      if (!data?.offline) {
        queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
        queryClient.invalidateQueries({ queryKey: ['completedToday'] });
        queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
        queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      }
      toast({
        title: 'Notes saved!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update job order mutation
  const updateJobOrderMutation = useMutation({
    mutationFn: async ({ jobOrders }: { jobOrders: Array<{ id: string; order_index: number }> }) => {
      // Validate session before critical operation
      await validateSession(user?.id);

      // Use RPC call or batch update - Supabase doesn't support batch updates directly,
      // so we'll use Promise.all with individual updates
      // This is efficient for small batches (< 50 jobs)
      const updates = jobOrders.map(({ id, order_index }) =>
        supabase
          .from('jobs')
          .update({ order_index })
          .eq('id', id)
          .eq('status', 'pending') // SECURITY: Only update pending jobs
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error).map(r => r.error!);
      
      if (errors.length > 0) {
        const firstError = errors[0];
        throw new Error(firstError.message || `Failed to update ${errors.length} job(s)`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
    },
    onError: (error) => {
      console.error('Error updating job order:', error);
      // Don't show toast on error - let the component handle it
    },
  });

  // Assign job to helper mutation
  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);
      
      // Basic validation: check if userId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        throw new Error('Invalid helper ID');
      }
      
      // PROACTIVE CHECK: Verify helper exists in auth.users before attempting assignment
      // This prevents foreign key constraint errors and provides better UX
      try {
        // First check if helper exists in auth.users by checking profiles
        // (We can't query auth.users directly, but profiles requires auth.users)
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        
        // If profile doesn't exist, helper doesn't exist in auth.users
        if (!profileCheck) {
          // Check team_members to get helper details for better error message
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('helper_id, helper_name, helper_email, is_active')
            .eq('helper_id', userId)
            .eq('owner_id', user.id)
            .maybeSingle();
          
          if (teamMember) {
            const helperName = teamMember.helper_name || 'This helper';
            const helperEmail = teamMember.helper_email;
            const isTempEmail = helperEmail?.endsWith('@temp.helper');
            
            if (isTempEmail) {
              throw new Error(
                `"${helperName}" needs to sign up first before you can assign jobs. ` +
                `They're already added to your team! Once they create an account, you'll be able to assign jobs immediately.`
              );
            } else {
              throw new Error(
                `"${helperName}" needs to sign up first before you can assign jobs. ` +
                `They're already added to your team! Once they create an account with ${helperEmail || 'their email'}, you'll be able to assign jobs immediately.`
              );
            }
          } else {
            // Helper not in team_members either - data inconsistency
            console.error('[Assign Job] Helper not found in profiles or team_members', {
              userId,
              profileError,
              profileCheck,
              jobId
            });
            
            // Check if userId is actually a jobId (common mistake)
            const { data: jobCheck } = await supabase
              .from('jobs')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            
            if (jobCheck) {
              throw new Error(
                `Invalid helper ID. It looks like a job ID was passed instead of a helper ID. ` +
                `Please try selecting the helper again.`
              );
            }
            
            throw new Error(
              `This helper account (ID: ${userId.slice(0, 8)}...) doesn't exist in the system. ` +
              `They may need to sign up first, or there may be a data inconsistency. ` +
              `Please remove and re-add this helper from your team.`
            );
          }
        }
        
        // Helper exists in auth.users, now check team_members for additional validation
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('helper_id, helper_name, helper_email, is_active')
          .eq('helper_id', userId)
          .eq('owner_id', user.id)
          .maybeSingle();
        
        if (teamMember) {
          // Check if helper is active - inactive helpers cannot be assigned to jobs
          if (teamMember.is_active === false) {
            throw new Error('This helper is inactive and cannot be assigned to jobs.');
          }
        }
        // If not in team_members, that's OK - they'll be auto-added
        // But we can still proceed with assignment since they exist in auth.users
      } catch (validationError) {
        // If it's our custom error, re-throw it
        if (validationError instanceof Error && (
          validationError.message.includes('needs to sign up') ||
          validationError.message.includes('inactive and cannot be assigned') ||
          validationError.message.includes('doesn\'t exist or hasn\'t been set up')
        )) {
          throw validationError;
        }
        // Other errors are non-critical - proceed with assignment anyway
        console.warn('[Assign Job] Team member validation failed:', validationError);
      }

      // Insert assignment (multiple assignments per job now allowed)
      // Use upsert with job_id + assigned_to_user_id to prevent duplicates
      console.log('[Assign Job] Attempting to assign job', { jobId, userId, assignedBy: user.id });
      const { data, error } = await supabase
        .from('job_assignments')
        .upsert({
          job_id: jobId,
          assigned_to_user_id: userId,
          assigned_by_user_id: user.id,
        }, {
          onConflict: 'job_id,assigned_to_user_id' // Use column names for unique constraint
        })
        .select();

      if (error) {
        console.error('[Assign Job Error]', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          jobId,
          userId
        });
        // Check if it's a foreign key constraint error (helper doesn't exist in auth.users)
        if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
          // Check if this is a placeholder helper (exists in team_members but not in auth.users)
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('helper_name, helper_email')
            .eq('helper_id', userId)
            .eq('owner_id', user.id)
            .maybeSingle();
          
          if (teamMember) {
            // Helper exists in team_members but not in auth.users - they need to sign up
            const helperName = teamMember.helper_name || 'This helper';
            const helperEmail = teamMember.helper_email;
            const isTempEmail = helperEmail.endsWith('@temp.helper');
            
            if (isTempEmail) {
              throw new Error(
                `"${helperName}" needs to sign up first. ` +
                `They're already added to your team! Once they create an account, you'll be able to assign jobs to them immediately.`
              );
            } else {
              // Real email provided but helper hasn't signed up yet
              throw new Error(
                `"${helperName}" needs to sign up first. ` +
                `They're already added to your team! Once they create an account with ${helperEmail}, you'll be able to assign jobs immediately. ` +
                `You can send them an invite or they can sign up directly.`
              );
            }
          }
          throw new Error('This helper needs to sign up first. They\'ll appear in your list once they create an account.');
        }
        throw error;
      }

      console.log('[Assign Job] Assignment successful', { 
        data, 
        jobId, 
        userId,
        assignmentId: data?.[0]?.id 
      });
      
      // Verify assignment was actually created
      if (!data || data.length === 0) {
        console.warn('[Assign Job] WARNING: Upsert returned no data!', {
          jobId,
          userId
        });
      }

      // Auto-populate team_members if not already there
      // This auto-discovers helpers and adds them to the team
      try {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('owner_id', user.id)
          .eq('helper_id', userId)
          .maybeSingle();
        
        if (!existingMember) {
          // Try to get email from existing team member or use placeholder
          // First check if helper is already in team_members with different owner
          const { data: existingHelper } = await supabase
            .from('team_members')
            .select('helper_email, helper_name')
            .eq('helper_id', userId)
            .limit(1)
            .maybeSingle();
          
          const helperEmail = existingHelper?.helper_email || userId.slice(0, 8) + '...';
          const helperName = existingHelper?.helper_name || null;
          
          try {
            const { error: insertError } = await supabase
              .from('team_members')
              .insert({
                owner_id: user.id,
                helper_id: userId,
                helper_email: helperEmail,
                helper_name: helperName
              });
            if (insertError) {
              // Ignore errors - might already exist or RLS issue
              // This is non-critical, just log
              console.warn('[Auto-add team member]', insertError);
            }
          } catch (insertErr) {
            // Ignore errors - might already exist or RLS issue
            // This is non-critical, just log
            console.warn('[Auto-add team member]', insertErr);
          }
        }
      } catch (err) {
        // Non-critical - just log
        console.warn('[Auto-add team member failed]', err);
      }
    },
    onMutate: async ({ jobId, userId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['assignedJobs'] });

      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);
      const previousAssigned = queryClient.getQueryData(['assignedJobs', user?.id, today]);

      // Create new assignment for optimistic update
      const newAssignment: JobAssignmentWithUser = {
        id: '',
        job_id: jobId,
        assigned_to_user_id: userId,
        assigned_by_user_id: user!.id,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      } as JobAssignmentWithUser;

      // Update pending jobs
      queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const existingAssignments = job.assignments || [];
            // Add new assignment if not already present
            const updatedAssignments = existingAssignments.find(a => a.assigned_to_user_id === userId)
              ? existingAssignments
              : [...existingAssignments, newAssignment];
            return {
              ...job,
              assignments: updatedAssignments,
              assignment: updatedAssignments[0] // Backward compatibility
            };
          }
          return job;
        });
      });

      // Update upcoming jobs
      queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const existingAssignments = job.assignments || [];
            const updatedAssignments = existingAssignments.find(a => a.assigned_to_user_id === userId)
              ? existingAssignments
              : [...existingAssignments, newAssignment];
            return {
              ...job,
              assignments: updatedAssignments,
              assignment: updatedAssignments[0]
            };
          }
          return job;
        });
      });

      // Update assignedJobs if the job is assigned to current user (helper view)
      if (userId === user?.id) {
        queryClient.setQueryData(['assignedJobs', user.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
          // Check if job is already in the list
          const existingIndex = old.findIndex(j => j.id === jobId);
          if (existingIndex >= 0) {
            // Update existing job's assignment
            return old.map(job => 
              job.id === jobId 
                ? { ...job, assignment: { id: '', job_id: jobId, assigned_to_user_id: userId, assigned_by_user_id: user!.id, assigned_at: new Date().toISOString(), created_at: new Date().toISOString() } as JobAssignmentWithUser }
                : job
            );
          } else {
            // Job might not be in assignedJobs yet (if it was just assigned)
            // Try to find it in pendingJobs and add it
            const pendingJob = pendingJobs.find(j => j.id === jobId);
            if (pendingJob) {
              return [...old, {
                ...pendingJob,
                assignment: { id: '', job_id: jobId, assigned_to_user_id: userId, assigned_by_user_id: user!.id, assigned_at: new Date().toISOString(), created_at: new Date().toISOString() } as JobAssignmentWithUser
              } as JobWithCustomerAndAssignment];
            }
            // If not found, return old - real data will come from invalidation
            return old;
          }
        });
      }

      return { previousPending, previousUpcoming, previousAssigned };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
    },
    onSuccess: () => {
      console.log('[Assign Job] Invalidating queries after successful assignment');
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
    },
  });

  // Assign multiple users to a job mutation
  const assignMultipleUsersMutation = useMutation({
    mutationFn: async ({ jobId, userIds }: { jobId: string; userIds: string[] }) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);
      
      if (!userIds || userIds.length === 0) {
        throw new Error('At least one user must be selected');
      }
      
      // Validate all user IDs are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = userIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        throw new Error('Invalid helper ID(s)');
      }
      
      // Pre-flight check: Verify all helpers are active before attempting assignment
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('helper_id, helper_name, is_active')
        .eq('owner_id', user.id)
        .in('helper_id', userIds);
      
      if (teamMembers && teamMembers.length > 0) {
        const inactiveHelpers = teamMembers.filter(tm => tm.is_active === false);
        if (inactiveHelpers.length > 0) {
          const names = inactiveHelpers.map(h => h.helper_name || 'Helper').join(', ');
          throw new Error(
            `The following helper${inactiveHelpers.length > 1 ? 's' : ''} ${inactiveHelpers.length > 1 ? 'are' : 'is'} inactive and cannot be assigned to jobs: ${names}.`
          );
        }
      }
      
      // Insert all assignments (upsert to prevent duplicates)
      const assignments = userIds.map(userId => ({
        job_id: jobId,
        assigned_to_user_id: userId,
        assigned_by_user_id: user.id,
      }));
      
      console.log('[Assign Multiple Users] Attempting to assign job to multiple users', { jobId, userIds, assignedBy: user.id, assignments });
      const { data, error } = await supabase
        .from('job_assignments')
        .upsert(assignments, {
          onConflict: 'job_id,assigned_to_user_id' // Use column names for unique constraint
        })
        .select();

      if (error) {
        console.error('[Assign Multiple Users Error]', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          jobId,
          userIds,
          assignments
        });
        // Check for foreign key constraint errors (placeholder helpers)
        if (error.code === '23503' || error.message.includes('foreign key')) {
          // Find which helpers are placeholders (exist in team_members but not in auth.users)
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('helper_id, helper_name, helper_email')
            .eq('owner_id', user.id)
            .in('helper_id', userIds);
          
          // All helpers in team_members that don't exist in auth.users are placeholders
          // (The foreign key constraint fails because helper_id doesn't exist in auth.users)
          const placeholderHelpers = teamMembers || [];
          
          if (placeholderHelpers.length > 0) {
            const names = placeholderHelpers.map(h => h.helper_name || 'Helper').join(', ');
            const hasRealEmails = placeholderHelpers.some(h => !h.helper_email.endsWith('@temp.helper'));
            
            if (hasRealEmails) {
              const emails = placeholderHelpers
                .filter(h => !h.helper_email.endsWith('@temp.helper'))
                .map(h => h.helper_email)
                .join(', ');
              throw new Error(
                `The following helper${placeholderHelpers.length > 1 ? 's' : ''} need to sign up first: ${names}. ` +
                `They're already added to your team! Once they create accounts${emails ? ` with ${emails}` : ''}, you'll be able to assign jobs immediately.`
              );
            } else {
              throw new Error(
                `The following helper${placeholderHelpers.length > 1 ? 's' : ''} need to sign up first: ${names}. ` +
                `They're already added to your team! Once they create accounts, you'll be able to assign jobs immediately.`
              );
            }
          }
          throw new Error('One or more helpers need to sign up first before assignments can be made.');
        }
        throw error;
      }

      console.log('[Assign Multiple Users] Assignments successful', { 
        data, 
        jobId, 
        userIds, 
        assignmentCount: data?.length || 0 
      });
      
      // Verify assignments were actually created
      if (!data || data.length === 0) {
        console.warn('[Assign Multiple Users] WARNING: Upsert returned no data!', {
          jobId,
          userIds,
          assignments
        });
      } else {
        console.log('[Assign Multiple Users] Created assignments:', data.map(a => ({
          id: a.id,
          job_id: a.job_id,
          assigned_to_user_id: a.assigned_to_user_id
        })));
      }
      
      // Auto-populate team_members for any new helpers
      // (non-critical, can fail silently)
      for (const userId of userIds) {
        try {
          const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('owner_id', user.id)
            .eq('helper_id', userId)
            .maybeSingle();
          
          if (!existingMember) {
            const { data: existingHelper } = await supabase
              .from('team_members')
              .select('helper_email, helper_name')
              .eq('helper_id', userId)
              .limit(1)
              .maybeSingle();
            
            const helperEmail = existingHelper?.helper_email || userId.slice(0, 8) + '...';
            const helperName = existingHelper?.helper_name || null;
            
            try {
              const { error: insertError } = await supabase
                .from('team_members')
                .insert({
                  owner_id: user.id,
                  helper_id: userId,
                  helper_email: helperEmail,
                  helper_name: helperName
                });
              if (insertError) {
                // Ignore errors - non-critical
                console.warn('[Auto-add team member (multiple)]', insertError);
              }
            } catch (insertErr) {
              // Ignore errors - non-critical
              console.warn('[Auto-add team member (multiple)]', insertErr);
            }
          }
        } catch (err) {
          // Ignore errors - non-critical
        }
      }
    },
    onMutate: async ({ jobId, userIds }) => {
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['assignedJobs'] });

      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);
      const previousAssigned = queryClient.getQueryData(['assignedJobs', user?.id, today]);

      // Create assignments array for optimistic update
      const newAssignments: JobAssignmentWithUser[] = userIds.map(userId => ({
        id: '',
        job_id: jobId,
        assigned_to_user_id: userId,
        assigned_by_user_id: user!.id,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      } as JobAssignmentWithUser));

      // Update pending jobs
      queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const existingAssignments = job.assignments || [];
            // Merge with new assignments, avoiding duplicates
            const merged = [...existingAssignments];
            userIds.forEach(userId => {
              if (!merged.find(a => a.assigned_to_user_id === userId)) {
                merged.push(newAssignments.find(a => a.assigned_to_user_id === userId)!);
              }
            });
            return {
              ...job,
              assignments: merged,
              assignment: merged[0] // Backward compatibility
            };
          }
          return job;
        });
      });

      // Update upcoming jobs
      queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const existingAssignments = job.assignments || [];
            const merged = [...existingAssignments];
            userIds.forEach(userId => {
              if (!merged.find(a => a.assigned_to_user_id === userId)) {
                merged.push(newAssignments.find(a => a.assigned_to_user_id === userId)!);
              }
            });
            return {
              ...job,
              assignments: merged,
              assignment: merged[0]
            };
          }
          return job;
        });
      });

      return { previousPending, previousUpcoming, previousAssigned };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update for all affected queries
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
      if (context?.previousAssigned) {
        queryClient.setQueryData(['assignedJobs', user?.id, today], context.previousAssigned);
      }
      
      // Log error for debugging
      console.error('[Assign Multiple Users] Optimistic update rollback:', err);
    },
    onSuccess: () => {
      console.log('[Assign Multiple Users] Invalidating queries after successful assignment');
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
    },
  });

  // Unassign job mutation (supports unassigning specific user or all users)
  const unassignJobMutation = useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);

      // If userId provided, unassign only that user; otherwise unassign all
      const query = supabase
        .from('job_assignments')
        .delete()
        .eq('job_id', jobId);
      
      if (userId) {
        query.eq('assigned_to_user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('[Unassign Job Error]', error);
        throw error;
      }
    },
    onMutate: async ({ jobId, userId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });
      await queryClient.cancelQueries({ queryKey: ['assignedJobs'] });

      const previousPending = queryClient.getQueryData(['pendingJobs', user?.id, today]);
      const previousUpcoming = queryClient.getQueryData(['upcomingJobs', user?.id, today]);
      const previousAssigned = queryClient.getQueryData(['assignedJobs', user?.id, today]);

      // Remove assignment(s) from pending jobs
      queryClient.setQueryData(['pendingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const assignments = job.assignments || [];
            if (userId) {
              // Remove specific user assignment
              const filtered = assignments.filter(a => a.assigned_to_user_id !== userId);
              return {
                ...job,
                assignments: filtered,
                assignment: filtered[0] // Backward compatibility
              };
            } else {
              // Remove all assignments
              return {
                ...job,
                assignments: [],
                assignment: undefined
              };
            }
          }
          return job;
        });
      });

      // Remove assignment(s) from upcoming jobs
      queryClient.setQueryData(['upcomingJobs', user?.id, today], (old: JobWithCustomerAndAssignment[] = []) => {
        return old.map(job => {
          if (job.id === jobId) {
            const assignments = job.assignments || [];
            if (userId) {
              const filtered = assignments.filter(a => a.assigned_to_user_id !== userId);
              return {
                ...job,
                assignments: filtered,
                assignment: filtered[0]
              };
            } else {
              return {
                ...job,
                assignments: [],
                assignment: undefined
              };
            }
          }
          return job;
        });
      });

      return { previousPending, previousUpcoming, previousAssigned };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update for all affected queries
      if (context?.previousPending) {
        queryClient.setQueryData(['pendingJobs', user?.id, today], context.previousPending);
      }
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['upcomingJobs', user?.id, today], context.previousUpcoming);
      }
      if (context?.previousAssigned) {
        queryClient.setQueryData(['assignedJobs', user?.id, today], context.previousAssigned);
      }
      
      // Log error for debugging
      console.error('[Unassign Job] Optimistic update rollback:', err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
    },
  });

  // Create helper mutation (Just-in-Time helper creation)
  const createHelperMutation = useMutation({
    mutationFn: async ({ name, email }: { name: string; email?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);
      
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Helper name cannot be empty');
      }
      
      // Validate email format if provided
      const trimmedEmail = email?.trim().toLowerCase();
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw new Error('Please enter a valid email address');
        }
      }
      
      // Check for duplicate by name (case-insensitive)
      const { data: existingHelpers } = await supabase
        .from('team_members')
        .select('helper_id, helper_name, helper_email')
        .eq('owner_id', user.id)
        .ilike('helper_name', trimmedName);
      
      if (existingHelpers && existingHelpers.length > 0) {
        throw new Error(`A helper named "${trimmedName}" already exists`);
      }
      
      // Check for duplicate by email if provided
      if (trimmedEmail) {
        const { data: existingByEmail } = await supabase
          .from('team_members')
          .select('helper_id, helper_email, helper_name')
          .eq('owner_id', user.id)
          .eq('helper_email', trimmedEmail)
          .maybeSingle();
        
        if (existingByEmail) {
          throw new Error(`A helper with email "${trimmedEmail}" already exists`);
        }
      }
      
      // Generate a placeholder ID and email for the new helper
      const helperId = crypto.randomUUID();
      const sanitizedName = trimmedName.toLowerCase().replace(/\s+/g, '_');
      // Use provided email OR generate temp email
      const helperEmail = trimmedEmail || `${sanitizedName}@temp.helper`;
      // IMPORTANT: Always mark as placeholder - helper hasn't signed up yet!
      // They'll become "real" when they sign up and we match them via email
      const isPlaceholder = true;
      
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          owner_id: user.id,
          helper_id: helperId,
          helper_email: helperEmail,
          helper_name: trimmedName,
        })
        .select()
        .single();

      if (error) {
        console.error('[Create Helper Error]', error);
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error(`A helper with this information already exists`);
        }
        throw error;
      }
      
      return {
        id: helperId,
        email: helperEmail,
        name: trimmedName,
        initials: trimmedName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?',
        isTeamMember: true,
        isPlaceholder: isPlaceholder, // Always true - helper hasn't signed up yet
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
    },
  });

  const createHelper = async (name: string, email?: string) => {
    return createHelperMutation.mutateAsync({ name, email });
  };

  // Match placeholder helper with real user when they sign up
  // This should be called when a helper signs up (via Edge Function or trigger)
  const matchPlaceholderHelperMutation = useMutation({
    mutationFn: async ({ placeholderHelperId, realUserId }: { placeholderHelperId: string; realUserId: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);
      
      // Update all team_members entries with this placeholder ID to the real user ID
      const { error } = await supabase
        .from('team_members')
        .update({ helper_id: realUserId })
        .eq('helper_id', placeholderHelperId)
        .eq('owner_id', user.id);
      
      if (error) {
        console.error('[Match Placeholder Helper Error]', error);
        throw error;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
    },
  });

  const matchPlaceholderHelper = async (placeholderHelperId: string, realUserId: string) => {
    return matchPlaceholderHelperMutation.mutateAsync({ placeholderHelperId, realUserId });
  };

  // Real-time subscription for job assignments
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('job_assignments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
          filter: `assigned_to_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Real-time] Assignment change detected:', payload);
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['assignedJobs'] });
          queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
          queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
          queryClient.invalidateQueries({ queryKey: ['helpers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Remove helper from team (delete team_members entry)
  const removeHelperMutation = useMutation({
    mutationFn: async (helperId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      await validateSession(user.id);
      
      // Delete the team_members entry
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('helper_id', helperId)
        .eq('owner_id', user.id);
      
      if (error) {
        console.error('[Remove Helper Error]', error);
        throw error;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['helpers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
    },
  });

  const removeHelper = async (helperId: string) => {
    return removeHelperMutation.mutateAsync(helperId);
  };

  const completeJob = (jobId: string, customAmount?: number, photoUrl?: string) => {
    return completeJobMutation.mutateAsync({ jobId, customAmount, photoUrl });
  };

  const addCustomer = (data: {
    name: string;
    address: string;
    mobile_phone: string;
    price: number;
    frequency_weeks: number;
    first_clean_date: string;
    preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
    notes?: string;
  }) => {
    return addCustomerMutation.mutateAsync(data);
  };

  const updateCustomer = (id: string, data: {
    name: string;
    address: string;
    mobile_phone: string | null;
    price: number;
    frequency_weeks: number;
    preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
    notes?: string | null;
  }) => {
    return updateCustomerMutation.mutateAsync({ id, data });
  };

  // archiveCustomer is now a simple async function defined above (line ~1155)

  const unarchiveCustomer = (id: string) => {
    return unarchiveCustomerMutation.mutateAsync(id);
  };

  const scrubCustomerData = (id: string) => {
    return scrubCustomerDataMutation.mutateAsync(id);
  };

  const updateBusinessName = (newName: string) => {
    return updateBusinessNameMutation.mutateAsync(newName);
  };

  const rescheduleJob = (jobId: string, newDate: string) => {
    return rescheduleJobMutation.mutateAsync({ jobId, newDate });
  };

  const skipJob = (jobId: string) => {
    return skipJobMutation.mutateAsync(jobId);
  };

  const markJobPaid = (jobId: string, method: 'cash' | 'transfer') => {
    return markJobPaidMutation.mutateAsync({ jobId, method });
  };

  const batchMarkPaid = (jobIds: string[], method: 'cash' | 'transfer') => {
    return batchMarkPaidMutation.mutateAsync({ jobIds, method });
  };

  const updateJobNotes = (jobId: string, notes: string | null) => {
    return updateJobNotesMutation.mutateAsync({ jobId, notes });
  };

  const updateJobOrder = (jobOrders: Array<{ id: string; order_index: number }>) => {
    return updateJobOrderMutation.mutateAsync({ jobOrders });
  };

  const assignJob = (jobId: string, userId: string) => {
    return assignJobMutation.mutateAsync({ jobId, userId });
  };

  const assignMultipleUsers = (jobId: string, userIds: string[]) => {
    return assignMultipleUsersMutation.mutateAsync({ jobId, userIds });
  };

  const unassignJob = (jobId: string, userId?: string) => {
    return unassignJobMutation.mutateAsync({ jobId, userId });
  };

  const undoCompleteJob = (jobId: string, newJobId: string) => {
    return undoCompleteJobMutation.mutateAsync({ jobId, newJobId });
  };

  const undoMarkPaid = (jobId: string) => {
    return undoMarkPaidMutation.mutateAsync(jobId);
  };

  const undoSkipJob = (jobId: string, originalDate: string) => {
    return rescheduleJobMutation.mutateAsync({ jobId, newDate: originalDate });
  };

  const updateGoogleReviewLink = (link: string | null) => {
    return updateGoogleReviewLinkMutation.mutateAsync(link);
  };

  const businessName = profile?.business_name || 'Welcome';
  const googleReviewLink = profile?.google_review_link;
  // Fetch expenses with job links
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<ExpenseWithJob[]>({
    queryKey: ['expenses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          job:jobs(
            *,
            customer:customers(*)
          )
        `)
        .eq('owner_id', user.id)
        .order('date', { ascending: false })
        .limit(100);
      
      // Handle 404 gracefully - table doesn't exist yet
      if (error && (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist'))) {
        console.log('[useSupabaseData] Expenses table does not exist yet, returning empty array');
        return [];
      }
      
      if (error) {
        console.warn('[useSupabaseData] Failed to fetch expenses (non-critical):', error);
        return []; // Return empty array instead of throwing
      }
      
      return (data || []).map(expense => ({
        ...expense,
        job: expense.job ? {
          ...expense.job,
          customer: expense.job.customer as Customer,
        } : undefined,
      })) as ExpenseWithJob[];
    },
    enabled: !!user,
  });

  // Calculate total expenses this month
  const totalExpensesThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return expenses
      .filter(expense => new Date(expense.date) >= startOfMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const isLoading = customersLoading || jobsLoading || completedLoading || upcomingLoading || weeklyLoading || unpaidLoading || paidLoading || archivedLoading || allArchivedLoading || expensesLoading;

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] }),
      queryClient.invalidateQueries({ queryKey: ['completedToday'] }),
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] }),
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] }),
      queryClient.invalidateQueries({ queryKey: ['helpers'] }),
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] }),
      queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    ]);
  };

  return {
    customers,
    pendingJobs,
    upcomingJobs,
    assignedJobs,
    completedToday,
    todayEarnings,
    weeklyEarnings,
    unpaidJobs,
    paidThisWeek,
    totalOutstanding,
    recentlyArchivedCustomers,
    allArchivedCustomers,
    businessName,
    profile,
    helpers,
    helpersLoading,
    teamMemberships,
    expenses,
    totalExpensesThisMonth,
    completeJob,
    addCustomer,
    updateCustomer,
    archiveCustomer,
    unarchiveCustomer,
    scrubCustomerData,
    updateBusinessName,
    updateGoogleReviewLink,
    rescheduleJob,
    skipJob,
    markJobPaid,
    batchMarkPaid,
    updateJobNotes,
    updateJobOrder,
    assignJob,
    assignMultipleUsers,
    unassignJob,
    createHelper,
    removeHelper,
    matchPlaceholderHelper,
    undoCompleteJob,
    undoMarkPaid,
    undoSkipJob,
    refetchAll,
    isLoading: isLoading || assignedJobsLoading || helpersLoading || teamMembershipsLoading,
    isOnline,
    userEmail: user?.email || '',
    isMarkingPaid: markJobPaidMutation.isPending,
    isBatchMarkingPaid: batchMarkPaidMutation.isPending,
  };
}
