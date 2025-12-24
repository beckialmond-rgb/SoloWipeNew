import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle, Clock, Plus, Grid3X3, List, Target, PoundSterling, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { CalendarAddCustomerModal } from '@/components/CalendarAddCustomerModal';
import { TextCustomerButton } from '@/components/TextCustomerButton';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useHaptics } from '@/hooks/useHaptics';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ViewMode = 'month' | 'week';

const Calendar = () => {
  const { pendingJobs, upcomingJobs, completedToday, addCustomer, rescheduleJob, isLoading } = useSupabaseData();
  const { lightTap } = useHaptics();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);

  // Combine all jobs for the calendar view
  const allJobs = useMemo(() => {
    return [...pendingJobs, ...upcomingJobs, ...completedToday];
  }, [pendingJobs, upcomingJobs, completedToday]);

  // Get jobs for a specific date
  const getJobsForDate = (date: Date) => {
    return allJobs.filter(job => {
      const jobDate = parseISO(job.scheduled_date);
      return isSameDay(jobDate, date);
    });
  };

  // Get jobs for selected date
  const selectedDateJobs = selectedDate ? getJobsForDate(selectedDate) : [];

  // Calculate stats for selected date
  const selectedDateStats = useMemo(() => {
    if (!selectedDate) return null;
    const jobs = getJobsForDate(selectedDate);
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const unpaidJobs = jobs.filter(j => j.status === 'completed' && j.payment_status === 'unpaid');
    
    const totalRevenue = jobs.reduce((sum, job) => {
      return sum + (job.amount_collected ?? job.customer.price ?? 0);
    }, 0);
    
    const potentialRevenue = pendingJobs.reduce((sum, job) => {
      return sum + (job.customer.price ?? 0);
    }, 0);
    
    return {
      total: jobs.length,
      pending: pendingJobs.length,
      completed: completedJobs.length,
      unpaid: unpaidJobs.length,
      totalRevenue,
      potentialRevenue,
    };
  }, [selectedDate, allJobs]);

  // Calendar grid days - month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calendar grid days - week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = monthStart.getDay();

  // Create empty slots for days before the month starts
  const emptySlots = Array(startDayOfWeek).fill(null);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(isSameDay(date, selectedDate || new Date(0)) ? null : date);
  };

  const handleJobClick = (job: JobWithCustomer) => {
    if (job.status === 'pending') {
      setSelectedJob(job);
      setRescheduleModalOpen(true);
    }
  };

  const handleReschedule = async (jobId: string, newDate: string) => {
    try {
      await rescheduleJob(jobId, newDate);
      setSelectedJob(null);
    } catch (error) {
      // Error is already handled by the mutation, but we need to keep the modal open
      console.error('Failed to reschedule job:', error);
    }
  };

  const toggleViewMode = () => {
    lightTap();
    setViewMode(prev => prev === 'month' ? 'week' : 'month');
    setSelectedDate(null);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    lightTap();
    if (direction === 'left') {
      handleNext();
    } else {
      handlePrev();
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getHeaderText = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    const weekStartFormatted = format(weekStart, 'd MMM');
    const weekEndFormatted = format(weekEnd, 'd MMM yyyy');
    return `${weekStartFormatted} - ${weekEndFormatted}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading calendar..." />
        ) : (
          <>
            {/* Calendar Header - Enhanced */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary dark:text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold text-foreground dark:text-foreground">Calendar</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
                className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md touch-sm"
              >
                {viewMode === 'month' ? (
                  <>
                    <List className="w-4 h-4" />
                    Week
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-4 h-4" />
                    Month
                  </>
                )}
              </Button>
            </motion.div>

            {/* Navigation - Enhanced with Large Touch Targets */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between mb-6"
            >
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="h-12 w-12 border-2 shadow-sm hover:shadow-md touch-sm"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
              </Button>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-xl font-extrabold text-foreground dark:text-foreground text-center">
                  {getHeaderText()}
                </h2>
                {/* Show "Today" button only when today is not visible in current view */}
                {(() => {
                  const today = new Date();
                  const isTodayVisible = viewMode === 'month' 
                    ? isSameMonth(today, currentDate)
                    : isWithinInterval(today, { start: weekStart, end: weekEnd });
                  return !isTodayVisible;
                })() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      lightTap();
                      setCurrentDate(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="h-8 text-xs font-semibold text-primary border-2 shadow-sm touch-sm"
                  >
                    Today
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-12 w-12 border-2 shadow-sm hover:shadow-md touch-sm"
              >
                <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
              </Button>
            </motion.div>

            {/* Calendar Grid with Swipe - Enhanced */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-card rounded-2xl border-2 border-border shadow-xl p-4 mb-6 touch-pan-y",
                "dark:border-border"
              )}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                const threshold = 50;
                if (info.offset.x > threshold) {
                  handleSwipe('right');
                } else if (info.offset.x < -threshold) {
                  handleSwipe('left');
                }
              }}
            >
              {/* Week day headers - Enhanced */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-foreground dark:text-foreground py-2 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {viewMode === 'month' && (
                  <>
                    {/* Empty slots for month view */}
                    {emptySlots.map((_, index) => (
                      <div key={`empty-${index}`} className="aspect-square" />
                    ))}

                    {/* Days of the month - Enhanced with Vibrant Indicators */}
                    {daysInMonth.map(day => {
                      const dayJobs = getJobsForDate(day);
                      const pendingJobs = dayJobs.filter(j => j.status === 'pending');
                      const completedJobs = dayJobs.filter(j => j.status === 'completed');
                      const unpaidJobs = dayJobs.filter(j => j.status === 'completed' && j.payment_status === 'unpaid');
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDayToday = isToday(day);

                      return (
                        <motion.button
                          key={day.toISOString()}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all touch-sm min-h-[48px]",
                            "border-2",
                            isSelected && "bg-primary text-primary-foreground border-primary shadow-lg scale-105",
                            !isSelected && isDayToday && "bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary font-extrabold border-primary/40 dark:border-primary/40 shadow-md",
                            !isSelected && !isDayToday && "hover:bg-muted/50 dark:hover:bg-muted/50 border-transparent hover:border-border",
                            !isSameMonth(day, currentDate) && "text-muted-foreground/40 opacity-50"
                          )}
                        >
                          <span className={cn(
                            "text-base font-bold",
                            isSelected && "text-primary-foreground",
                            !isSelected && isDayToday && "text-primary dark:text-primary",
                            !isSelected && !isDayToday && "text-foreground dark:text-foreground"
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          {/* Job indicators - Vibrant Pills */}
                          {dayJobs.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap justify-center max-w-full">
                              {pendingJobs.length > 0 && (
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  isSelected ? "bg-primary-foreground" : "bg-blue-500 dark:bg-blue-500"
                                )} />
                              )}
                              {completedJobs.length > 0 && (
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  isSelected ? "bg-primary-foreground/70" : "bg-green-500 dark:bg-green-500"
                                )} />
                              )}
                              {unpaidJobs.length > 0 && (
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  isSelected ? "bg-primary-foreground/50" : "bg-amber-500 dark:bg-amber-500"
                                )} />
                              )}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </>
                )}

                {viewMode === 'week' && (
                  <>
                    {/* Week view - Enhanced larger day cells */}
                    {daysInWeek.map(day => {
                      const dayJobs = getJobsForDate(day);
                      const pendingJobs = dayJobs.filter(j => j.status === 'pending');
                      const completedJobs = dayJobs.filter(j => j.status === 'completed');
                      const unpaidJobs = dayJobs.filter(j => j.status === 'completed' && j.payment_status === 'unpaid');
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDayToday = isToday(day);
                      const jobCount = dayJobs.length;

                      return (
                        <motion.button
                          key={day.toISOString()}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "min-h-[100px] flex flex-col items-center justify-start pt-3 rounded-xl relative transition-all touch-sm border-2",
                            isSelected && "bg-primary text-primary-foreground border-primary shadow-lg",
                            !isSelected && isDayToday && "bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary font-extrabold border-primary/40 dark:border-primary/40 shadow-md",
                            !isSelected && !isDayToday && "hover:bg-muted/50 dark:hover:bg-muted/50 border-transparent hover:border-border"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wide mb-1",
                            isSelected ? "text-primary-foreground/80" : isDayToday ? "text-primary dark:text-primary" : "text-muted-foreground"
                          )}>
                            {format(day, 'EEE')}
                          </span>
                          <span className={cn(
                            "text-2xl font-extrabold",
                            isSelected && "text-primary-foreground",
                            !isSelected && isDayToday && "text-primary dark:text-primary",
                            !isSelected && !isDayToday && "text-foreground dark:text-foreground"
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          {/* Job count badge - Enhanced */}
                          {jobCount > 0 && (
                            <div className="mt-2 flex flex-col items-center gap-1.5">
                              <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                              )}>
                                {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
                              </span>
                              <div className="flex gap-1">
                                {pendingJobs.length > 0 && (
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    isSelected ? "bg-primary-foreground" : "bg-blue-500 dark:bg-blue-500"
                                  )} />
                                )}
                                {completedJobs.length > 0 && (
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    isSelected ? "bg-primary-foreground/70" : "bg-green-500 dark:bg-green-500"
                                  )} />
                                )}
                                {unpaidJobs.length > 0 && (
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    isSelected ? "bg-primary-foreground/50" : "bg-amber-500 dark:bg-amber-500"
                                  )} />
                                )}
                              </div>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Legend - Enhanced */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t-2 border-border">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-500 shadow-sm" />
                  <span className="text-xs font-semibold text-foreground dark:text-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-500 shadow-sm" />
                  <span className="text-xs font-semibold text-foreground dark:text-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-500 shadow-sm" />
                  <span className="text-xs font-semibold text-foreground dark:text-foreground">Unpaid</span>
                </div>
              </div>
            </motion.div>

            {/* Selected Date Mini-Dashboard */}
            <AnimatePresence mode="wait">
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-extrabold text-foreground dark:text-foreground">
                      {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, d MMMM')}
                    </h3>
                    {selectedDateStats && selectedDateStats.total > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 dark:bg-primary/20 rounded-full border border-primary/30 dark:border-primary/40">
                        <Target className="w-4 h-4 text-primary dark:text-primary" />
                        <span className="text-sm font-bold text-primary dark:text-primary">
                          {selectedDateStats.total} {selectedDateStats.total === 1 ? 'job' : 'jobs'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats Cards - Mini Dashboard */}
                  {selectedDateStats && selectedDateStats.total > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Potential Revenue */}
                      {selectedDateStats.pending > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-card rounded-xl border-2 border-border shadow-md p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-500/20 flex items-center justify-center">
                              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Potential</span>
                          </div>
                          <p className="text-2xl font-extrabold text-foreground dark:text-foreground">
                            £{selectedDateStats.potentialRevenue.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{selectedDateStats.pending} pending</p>
                        </motion.div>
                      )}
                      
                      {/* Total Revenue */}
                      {selectedDateStats.totalRevenue > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="bg-card rounded-xl border-2 border-border shadow-md p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-green-500/15 dark:bg-green-500/20 flex items-center justify-center">
                              <PoundSterling className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</span>
                          </div>
                          <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                            £{selectedDateStats.totalRevenue.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedDateStats.completed} completed
                            {selectedDateStats.unpaid > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                • {selectedDateStats.unpaid} unpaid
                              </span>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Jobs List */}
                  {selectedDateJobs.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-card rounded-xl border-2 border-border shadow-md p-8 text-center"
                    >
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-foreground dark:text-foreground font-semibold mb-2">No jobs scheduled</p>
                      <p className="text-sm text-muted-foreground mb-6">Add a customer to schedule work for this day</p>
                      <Button
                        onClick={() => setAddCustomerOpen(true)}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md touch-sm"
                        size="lg"
                      >
                        <Plus className="w-5 h-5" />
                        Add Customer
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateJobs.map((job, index) => (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleJobClick(job)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl transition-all shadow-sm hover:shadow-md",
                            "border-2",
                            job.status === 'pending' 
                              ? "bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/40 cursor-pointer hover:bg-primary/15 dark:hover:bg-primary/25"
                              : job.payment_status === 'unpaid'
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                              : "bg-card border-border"
                          )}
                        >
                          {job.status === 'completed' ? (
                            <div className="w-10 h-10 rounded-full bg-green-500/15 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500/15 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground dark:text-foreground truncate text-base">
                              {job.customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {job.customer.address}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-extrabold text-foreground dark:text-foreground text-lg">
                                £{job.amount_collected ?? job.customer.price}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                {job.status === 'completed' && job.payment_status === 'unpaid' && (
                                  <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                )}
                                <p className={cn(
                                  "text-xs font-semibold",
                                  job.status === 'completed' 
                                    ? job.payment_status === 'unpaid'
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-green-600 dark:text-green-400"
                                    : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {job.status === 'completed' 
                                    ? job.payment_status === 'unpaid' ? 'Unpaid' : 'Done'
                                    : 'Pending'}
                                </p>
                              </div>
                            </div>
                            {/* Text Button - icon only for compact display */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <TextCustomerButton
                                phoneNumber={job.customer?.mobile_phone}
                                customerName={job.customer?.name || 'Customer'}
                                iconOnly={true}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint when no date selected - Enhanced */}
            {!selectedDate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center bg-card rounded-xl border-2 border-dashed border-border p-6"
              >
                <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-foreground dark:text-foreground font-semibold mb-1">Select a date</p>
                <p className="text-sm text-muted-foreground">Tap any date on the calendar to view scheduled jobs</p>
              </motion.div>
            )}
          </>
        )}
      </main>

      <RescheduleJobModal
        job={selectedJob}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onReschedule={handleReschedule}
      />

      {selectedDate && (
        <CalendarAddCustomerModal
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
          selectedDate={selectedDate}
          onSubmit={addCustomer}
        />
      )}

    </div>
  );
};

export default Calendar;
