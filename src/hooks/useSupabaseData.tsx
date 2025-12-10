import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer, JobWithCustomer } from '@/types/database';
import { format, addWeeks } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
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
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Insert customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          profile_id: user.id,
          name: data.name,
          address: data.address,
          mobile_phone: data.mobile_phone || null,
          price: data.price,
          frequency_weeks: data.frequency_weeks,
          status: 'active',
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Create first job with user-selected date
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          customer_id: newCustomer.id,
          scheduled_date: data.first_clean_date,
          status: 'pending',
        });

      if (jobError) throw jobError;

      return newCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      toast({
        title: 'Customer added!',
        description: 'First job scheduled.',
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
      };
    }) => {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      toast({
        title: 'Customer updated!',
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

  // Archive customer mutation
  const archiveCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      toast({
        title: 'Customer archived',
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

  const completeJob = (jobId: string) => {
    return completeJobMutation.mutateAsync(jobId);
  };

  const addCustomer = (data: {
    name: string;
    address: string;
    mobile_phone: string;
    price: number;
    frequency_weeks: number;
    first_clean_date: string;
  }) => {
    return addCustomerMutation.mutateAsync(data);
  };

  const updateCustomer = (id: string, data: {
    name: string;
    address: string;
    mobile_phone: string | null;
    price: number;
    frequency_weeks: number;
  }) => {
    return updateCustomerMutation.mutateAsync({ id, data });
  };

  const archiveCustomer = (id: string) => {
    return archiveCustomerMutation.mutateAsync(id);
  };

  const updateBusinessName = (newName: string) => {
    return updateBusinessNameMutation.mutateAsync(newName);
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
    addCustomer,
    updateCustomer,
    archiveCustomer,
    updateBusinessName,
    isLoading,
    userEmail: user?.email || '',
  };
}
