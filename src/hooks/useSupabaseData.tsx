import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer, JobWithCustomer } from '@/types/database';
import { format, addWeeks, startOfWeek, subWeeks } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export function useSupabaseData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const fourWeeksFromNow = format(addWeeks(new Date(), 4), 'yyyy-MM-dd');

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

  // Fetch upcoming jobs (next 4 weeks, after today)
  const { data: upcomingJobs = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcomingJobs', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'pending')
        .gt('scheduled_date', today)
        .lte('scheduled_date', fourWeeksFromNow)
        .order('scheduled_date');
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Fetch weekly earnings (last 8 weeks of completed jobs)
  const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
  
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
    for (let i = 0; i < 8; i++) {
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
  const { data: unpaidJobs = [], isLoading: unpaidLoading } = useQuery({
    queryKey: ['unpaidJobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Fetch paid jobs this week
  const sevenDaysAgo = format(subWeeks(new Date(), 1), 'yyyy-MM-dd');
  
  const { data: paidThisWeek = [], isLoading: paidLoading } = useQuery({
    queryKey: ['paidThisWeek', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
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
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Calculate total outstanding
  const totalOutstanding = unpaidJobs.reduce(
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

      // Determine payment status based on GoCardless
      const isGoCardless = !!job.customer.gocardless_id;
      const paymentStatus = isGoCardless ? 'paid' : 'unpaid';
      const paymentMethod = isGoCardless ? 'gocardless' : null;
      const paymentDate = isGoCardless ? completedAt : null;

      // 1. Update current job to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: completedAt,
          amount_collected: job.customer.price,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          payment_date: paymentDate,
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
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
    },
  });

  // Mark job as paid mutation
  const markJobPaidMutation = useMutation({
    mutationFn: async ({ jobId, method }: { jobId: string; method: 'cash' | 'transfer' }) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('jobs')
        .update({
          payment_status: 'paid',
          payment_method: method,
          payment_date: now,
        })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
      toast({
        title: 'Payment recorded!',
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
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
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
      // 1. Delete all pending jobs for this customer first
      const { error: jobsError } = await supabase
        .from('jobs')
        .delete()
        .eq('customer_id', id)
        .eq('status', 'pending');

      if (jobsError) throw jobsError;

      // 2. Then archive the customer
      const { error } = await supabase
        .from('customers')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      toast({
        title: 'Customer archived',
        description: 'All pending jobs cancelled.',
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

  // Reschedule job mutation
  const rescheduleJobMutation = useMutation({
    mutationFn: async ({ jobId, newDate }: { jobId: string; newDate: string }) => {
      const { error } = await supabase
        .from('jobs')
        .update({ scheduled_date: newDate })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      toast({
        title: 'Job rescheduled',
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

  // Skip job mutation - reschedules to next frequency interval without marking complete
  const skipJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Try to find in pending jobs first, then upcoming jobs
      const job = pendingJobs.find(j => j.id === jobId) || upcomingJobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const now = new Date();
      const nextDate = addWeeks(now, job.customer.frequency_weeks);
      const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('jobs')
        .update({ scheduled_date: nextScheduledDate })
        .eq('id', jobId);

      if (error) throw error;

      return {
        nextDate: format(nextDate, 'dd MMM yyyy'),
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      toast({
        title: 'Job skipped',
        description: `Rescheduled to ${result.nextDate}`,
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

  const rescheduleJob = (jobId: string, newDate: string) => {
    return rescheduleJobMutation.mutateAsync({ jobId, newDate });
  };

  const skipJob = (jobId: string) => {
    return skipJobMutation.mutateAsync(jobId);
  };

  const markJobPaid = (jobId: string, method: 'cash' | 'transfer') => {
    return markJobPaidMutation.mutateAsync({ jobId, method });
  };

  const businessName = profile?.business_name || 'My Window Cleaning';
  const isLoading = customersLoading || jobsLoading || completedLoading || upcomingLoading || weeklyLoading || unpaidLoading || paidLoading;

  return {
    customers,
    pendingJobs,
    upcomingJobs,
    completedToday,
    todayEarnings,
    weeklyEarnings,
    unpaidJobs,
    paidThisWeek,
    totalOutstanding,
    businessName,
    completeJob,
    addCustomer,
    updateCustomer,
    archiveCustomer,
    updateBusinessName,
    rescheduleJob,
    skipJob,
    markJobPaid,
    isLoading,
    userEmail: user?.email || '',
  };
}
