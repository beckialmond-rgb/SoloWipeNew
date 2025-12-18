import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle, Clock, Plus, Grid3X3, List } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { CalendarAddCustomerModal } from '@/components/CalendarAddCustomerModal';
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
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
                className="gap-2"
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
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="h-10 w-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-lg font-semibold text-foreground text-center">
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
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      lightTap();
                      setCurrentDate(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="h-6 text-xs text-primary"
                  >
                    Today
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-10 w-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Calendar Grid with Swipe */}
            <motion.div 
              className="bg-card rounded-xl border border-border p-4 mb-6 touch-pan-y"
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
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
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

                    {/* Days of the month */}
                    {daysInMonth.map(day => {
                      const dayJobs = getJobsForDate(day);
                      const hasPending = dayJobs.some(j => j.status === 'pending');
                      const hasCompleted = dayJobs.some(j => j.status === 'completed');
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDayToday = isToday(day);

                      return (
                        <motion.button
                          key={day.toISOString()}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "aspect-square flex flex-col items-center justify-center rounded-lg relative transition-all",
                            isSelected && "bg-primary text-primary-foreground",
                            !isSelected && isDayToday && "bg-primary/10 text-primary font-bold",
                            !isSelected && !isDayToday && "hover:bg-muted",
                            !isSameMonth(day, currentDate) && "text-muted-foreground/50"
                          )}
                        >
                          <span className="text-sm">{format(day, 'd')}</span>
                          
                          {/* Job indicators */}
                          {dayJobs.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {hasPending && (
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isSelected ? "bg-primary-foreground" : "bg-primary"
                                )} />
                              )}
                              {hasCompleted && (
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isSelected ? "bg-primary-foreground/70" : "bg-green-500"
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
                    {/* Week view - larger day cells */}
                    {daysInWeek.map(day => {
                      const dayJobs = getJobsForDate(day);
                      const hasPending = dayJobs.some(j => j.status === 'pending');
                      const hasCompleted = dayJobs.some(j => j.status === 'completed');
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDayToday = isToday(day);
                      const jobCount = dayJobs.length;

                      return (
                        <motion.button
                          key={day.toISOString()}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "min-h-[80px] flex flex-col items-center justify-start pt-2 rounded-lg relative transition-all",
                            isSelected && "bg-primary text-primary-foreground",
                            !isSelected && isDayToday && "bg-primary/10 text-primary font-bold",
                            !isSelected && !isDayToday && "hover:bg-muted"
                          )}
                        >
                          <span className="text-xs text-muted-foreground mb-1">
                            {format(day, 'EEE')}
                          </span>
                          <span className="text-lg font-semibold">{format(day, 'd')}</span>
                          
                          {/* Job count badge */}
                          {jobCount > 0 && (
                            <div className="mt-1 flex flex-col items-center gap-0.5">
                              <span className={cn(
                                "text-xs font-medium",
                                isSelected ? "text-primary-foreground" : "text-foreground"
                              )}>
                                {jobCount} job{jobCount !== 1 ? 's' : ''}
                              </span>
                              <div className="flex gap-0.5">
                                {hasPending && (
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isSelected ? "bg-primary-foreground" : "bg-primary"
                                  )} />
                                )}
                                {hasCompleted && (
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isSelected ? "bg-primary-foreground/70" : "bg-green-500"
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

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
            </motion.div>

            {/* Selected Date Jobs */}
            <AnimatePresence mode="wait">
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-3"
                >
                  <h3 className="text-lg font-semibold text-foreground">
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, d MMMM')}
                  </h3>

                  {selectedDateJobs.length === 0 ? (
                    <div className="bg-muted/50 rounded-xl p-6 text-center">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No jobs scheduled</p>
                      <Button
                        onClick={() => setAddCustomerOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Customer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateJobs.map(job => (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => handleJobClick(job)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl transition-all",
                            job.status === 'pending' 
                              ? "bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10"
                              : "bg-muted/50"
                          )}
                        >
                          {job.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                          ) : (
                            <Clock className="w-5 h-5 text-primary shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {job.customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {job.customer.address}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-foreground">
                              £{job.amount_collected ?? job.customer.price}
                            </p>
                            <p className={cn(
                              "text-xs",
                              job.status === 'completed' ? "text-green-500" : "text-primary"
                            )}>
                              {job.status === 'completed' ? 'Done' : 'Pending'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint when no date selected */}
            {!selectedDate && (
              <div className="text-center text-muted-foreground text-sm">
                Tap a date to see scheduled jobs
              </div>
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
