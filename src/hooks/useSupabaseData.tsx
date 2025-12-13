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
        .is('cancelled_at', null)
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
        .is('cancelled_at', null)
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
      
      // Filter out jobs from archived customers (status = 'inactive')
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!inner(*)
        `)
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid')
        .eq('customer.status', 'active')
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

  // Fetch recently archived customers (within last 7 days)
  const sevenDaysAgoDate = format(subWeeks(new Date(), 1), 'yyyy-MM-dd');
  const { data: recentlyArchivedCustomers = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['recentlyArchived', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'inactive')
        .not('archived_at', 'is', null)
        .gte('archived_at', `${sevenDaysAgoDate}T00:00:00`)
        .order('archived_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  // Complete job mutation with optional custom amount and photo
  // Track in-flight job completions to prevent double-submission
  const completingJobIds = new Set<string>();

  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId, customAmount, photoUrl }: { jobId: string; customAmount?: number; photoUrl?: string }) => {
      // CRITICAL: Prevent double-submission of the same job
      if (completingJobIds.has(jobId)) {
        throw new Error('Job completion already in progress');
      }
      completingJobIds.add(jobId);

      try {
        const job = pendingJobs.find(j => j.id === jobId);
        if (!job) throw new Error('Job not found');

        // Double-check the job hasn't already been completed (race condition guard)
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();
        
        if (currentJob?.status === 'completed') {
          throw new Error('Job already completed');
        }

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

        // Use custom amount if provided, otherwise use customer's default price
        const amountCollected = customAmount ?? job.customer.price;

        // 1. Update current job to completed
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
          })
          .eq('id', jobId)
          .eq('status', 'pending'); // Only update if still pending (atomic guard)

        if (updateError) throw updateError;

        // 2. Create new job for the future
        const { data: newJob, error: insertError } = await supabase
          .from('jobs')
          .insert({
            customer_id: job.customer_id,
            scheduled_date: nextScheduledDate,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return {
          jobId,
          newJobId: newJob.id,
          collectedAmount: amountCollected,
          nextDate: format(nextDate, 'dd MMM yyyy'),
          customerName: job.customer.name,
        };
      } finally {
        // Always remove from tracking set when done
        completingJobIds.delete(jobId);
      }
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
      
      return { jobId, method };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Batch mark jobs as paid mutation
  const batchMarkPaidMutation = useMutation({
    mutationFn: async ({ jobIds, method }: { jobIds: string[]; method: 'cash' | 'transfer' }) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('jobs')
        .update({
          payment_status: 'paid',
          payment_method: method,
          payment_date: now,
        })
        .in('id', jobIds);

      if (error) throw error;
      
      return { count: jobIds.length, method };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
      queryClient.invalidateQueries({ queryKey: ['paidThisWeek'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyEarnings'] });
      toast({
        title: `${result.count} payments recorded!`,
        description: `Marked as ${result.method}`,
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
      notes?: string;
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
          notes: data.notes || null,
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
        notes?: string | null;
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

  // Archive customer mutation (soft-delete jobs instead of hard delete)
  const archiveCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();
      
      // 1. Soft-delete all pending jobs for this customer (set cancelled_at)
      const { error: jobsError } = await supabase
        .from('jobs')
        .update({ cancelled_at: now })
        .eq('customer_id', id)
        .eq('status', 'pending');

      if (jobsError) throw jobsError;

      // 2. Archive the customer with timestamp
      const { error } = await supabase
        .from('customers')
        .update({ status: 'inactive', archived_at: now })
        .eq('id', id);

      if (error) throw error;
      
      return { customerId: id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
      toast({
        title: 'Customer archived',
        description: 'You can restore them from Settings within 7 days.',
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

  // Unarchive customer mutation
  const unarchiveCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Restore the customer
      const { error: customerError } = await supabase
        .from('customers')
        .update({ status: 'active', archived_at: null })
        .eq('id', id);

      if (customerError) throw customerError;

      // 2. Restore cancelled pending jobs (clear cancelled_at)
      const { error: jobsError } = await supabase
        .from('jobs')
        .update({ cancelled_at: null })
        .eq('customer_id', id)
        .eq('status', 'pending')
        .not('cancelled_at', 'is', null);

      if (jobsError) throw jobsError;
      
      // Get the customer name for the toast
      const customer = recentlyArchivedCustomers.find(c => c.id === id);
      return { customerName: customer?.name || 'Customer' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
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

  // Update Google Review Link mutation
  const updateGoogleReviewLinkMutation = useMutation({
    mutationFn: async (link: string | null) => {
      if (!user) throw new Error('Not authenticated');

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

      const originalDate = job.scheduled_date;
      const now = new Date();
      const nextDate = addWeeks(now, job.customer.frequency_weeks);
      const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('jobs')
        .update({ scheduled_date: nextScheduledDate })
        .eq('id', jobId);

      if (error) throw error;

      return {
        jobId,
        originalDate,
        nextDate: format(nextDate, 'dd MMM yyyy'),
        customerName: job.customer.name,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Undo complete job mutation
  const undoCompleteJobMutation = useMutation({
    mutationFn: async ({ jobId, newJobId }: { jobId: string; newJobId: string }) => {
      // 1. Delete the newly created future job
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', newJobId);

      if (deleteError) throw deleteError;

      // 2. Reset the original job back to pending
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

  // Update job notes mutation
  const updateJobNotesMutation = useMutation({
    mutationFn: async ({ jobId, notes }: { jobId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('jobs')
        .update({ notes })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['completedToday'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['unpaidJobs'] });
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
    notes?: string | null;
  }) => {
    return updateCustomerMutation.mutateAsync({ id, data });
  };

  const archiveCustomer = (id: string) => {
    return archiveCustomerMutation.mutateAsync(id);
  };

  const unarchiveCustomer = (id: string) => {
    return unarchiveCustomerMutation.mutateAsync(id);
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

  const businessName = profile?.business_name || 'My Window Cleaning';
  const googleReviewLink = profile?.google_review_link;
  const isLoading = customersLoading || jobsLoading || completedLoading || upcomingLoading || weeklyLoading || unpaidLoading || paidLoading || archivedLoading;

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] }),
      queryClient.invalidateQueries({ queryKey: ['completedToday'] }),
      queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] }),
    ]);
  };

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
    recentlyArchivedCustomers,
    businessName,
    profile,
    completeJob,
    addCustomer,
    updateCustomer,
    archiveCustomer,
    unarchiveCustomer,
    updateBusinessName,
    updateGoogleReviewLink,
    rescheduleJob,
    skipJob,
    markJobPaid,
    batchMarkPaid,
    updateJobNotes,
    undoCompleteJob,
    undoMarkPaid,
    undoSkipJob,
    refetchAll,
    isLoading,
    userEmail: user?.email || '',
  };
}
