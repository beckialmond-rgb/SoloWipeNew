import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, TrendingUp, Calendar, MapPin, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { JobCard } from '@/components/JobCard';
import { HelperJobFilters, HelperJobFilters as HelperJobFiltersType, JobFilterStatus, JobFilterDateRange } from '@/components/HelperJobFilters';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { useRouteSorting } from '@/hooks/useRouteSorting';
import { JobWithCustomerAndAssignment } from '@/types/database';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const HelperDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignedJobs, completeJob, isLoading } = useSupabaseData();
  const { isHelper, isOwner, isLoading: roleLoading } = useRole();
  const { sortedJobs: sortedAssignedJobs } = useRouteSorting(assignedJobs);

  // Redirect if not helper
  useMemo(() => {
    if (!roleLoading && !isHelper) {
      navigate('/dashboard', { replace: true });
    }
  }, [isHelper, roleLoading, navigate]);

  const [filters, setFilters] = useState<HelperJobFiltersType>({
    searchQuery: '',
    status: 'all',
    dateRange: 'all',
  });

  // Calculate stats
  const stats = useMemo(() => {
    const pendingJobs = sortedAssignedJobs.filter(job => job.status === 'pending');
    const completedJobs = sortedAssignedJobs.filter(job => job.status === 'completed');
    const todayJobs = pendingJobs.filter(job => {
      const jobDate = parseISO(job.scheduled_date);
      const today = new Date();
      return format(jobDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    });

    return {
      totalAssigned: sortedAssignedJobs.length,
      pending: pendingJobs.length,
      completed: completedJobs.length,
      today: todayJobs.length,
      completionRate: sortedAssignedJobs.length > 0 
        ? Math.round((completedJobs.length / sortedAssignedJobs.length) * 100)
        : 0,
    };
  }, [sortedAssignedJobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    let filtered = [...sortedAssignedJobs];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(job => {
        const customerName = job.customer?.name?.toLowerCase() || '';
        const address = job.customer?.address?.toLowerCase() || '';
        return customerName.includes(query) || address.includes(query);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(job => {
        if (filters.status === 'pending') return job.status === 'pending';
        if (filters.status === 'completed') return job.status === 'completed';
        return true;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = endOfDay(now);

      switch (filters.dateRange) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'this-week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'this-month':
          startDate = startOfMonth(now);
          break;
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            startDate = startOfDay(parseISO(filters.customStartDate));
            endDate = endOfDay(parseISO(filters.customEndDate));
          } else {
            return filtered; // No custom dates set, return all
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(job => {
        const jobDate = parseISO(job.scheduled_date);
        return isWithinInterval(jobDate, { start: startDate, end: endDate });
      });
    }

    // Sort: pending jobs first (by date), then completed (by completion date desc)
    filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'pending') return 1;
      
      if (a.status === 'pending' && b.status === 'pending') {
        return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
      }
      
      if (a.status === 'completed' && b.status === 'completed') {
        const aCompleted = a.completed_at ? parseISO(a.completed_at).getTime() : 0;
        const bCompleted = b.completed_at ? parseISO(b.completed_at).getTime() : 0;
        return bCompleted - aCompleted; // Most recent first
      }
      
      return 0;
    });

    return filtered;
  }, [sortedAssignedJobs, filters]);

  const handleComplete = async (job: JobWithCustomerAndAssignment) => {
    await completeJob({
      jobId: job.id,
      customAmount: job.customer?.price,
    });
  };

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading your dashboard..." />
        <BottomNav />
      </div>
    );
  }

  if (!isHelper) {
    return null; // Will redirect via useMemo
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-4 max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">
            View and manage your assigned jobs
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Today's Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{stats.today}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{stats.completionRate}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <HelperJobFilters
            filters={filters}
            onFiltersChange={setFilters}
            assignedJobsCount={filteredJobs.length}
          />
        </motion.div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <EmptyState
            title={sortedAssignedJobs.length === 0 ? "No jobs assigned yet" : "No jobs match your filters"}
            description={
              sortedAssignedJobs.length === 0
                ? "Your owner hasn't assigned you any jobs yet. Check back later!"
                : "Try adjusting your filters to see more jobs."
            }
            icon={<MapPin className="w-12 h-12 text-primary" />}
          />
        ) : (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {filteredJobs.map((job, index) => (
              <motion.li
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <JobCard
                  job={job}
                  onComplete={handleComplete}
                  index={index}
                  businessName="SoloWipe"
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default HelperDashboard;

