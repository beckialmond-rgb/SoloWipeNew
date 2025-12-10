import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer, JobWithCustomer } from '@/types/database';
import { format, addWeeks } from 'date-fns';

export function useSupabaseData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
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

  // Fetch pending jobs for today (and overdue)
  const { data: pendingJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['pendingJobs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_date', today)
        .order('scheduled_date');
      
      if (error) throw error;
      
      // Transform to JobWithCustomer format
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Fetch completed jobs for today
  const { data: completedToday = [], isLoading: completedLoading } = useQuery({
    queryKey: ['completedToday', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Calculate today's earnings
  const todayEarnings = completedToday.reduce(
    (sum, job) => sum + (job.amount_collected || 0),
    0
  );

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const job = pendingJobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const now = new Date();
      const completedAt = now.toISOString();
      
      // Calculate next date from TODAY + frequency_weeks (not from old scheduled date)
      const nextDate = addWeeks(now, job.customer.frequency_weeks);
      const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');

      // 1. Update current job to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: completedAt,
          amount_collected: job.customer.price,
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // 2. Create new job for the future
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          customer_id: job.customer_id,
          scheduled_date: nextScheduledDate,
          status: 'pending',
        });

      if (insertError) throw insertError;

      return {
        collectedAmount: job.customer.price,
        nextDate: format(nextDate, 'dd MMM yyyy'),
      };
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
    },
  });

  const completeJob = (jobId: string) => {
    return completeJobMutation.mutateAsync(jobId);
  };

  const businessName = profile?.business_name || 'My Window Cleaning';
  const isLoading = customersLoading || jobsLoading || completedLoading;

  return {
    customers,
    pendingJobs,
    completedToday,
    todayEarnings,
    businessName,
    completeJob,
    isLoading,
    userEmail: user?.email || '',
  };
}
