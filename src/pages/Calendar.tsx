import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle, Clock, Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { QuickScheduleModal } from '@/components/QuickScheduleModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Calendar = () => {
  const { pendingJobs, upcomingJobs, completedToday, customers, rescheduleJob, isLoading } = useSupabaseData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [quickScheduleOpen, setQuickScheduleOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);

  // Active customers for quick schedule
  const activeCustomers = useMemo(() => {
    return customers.filter(c => c.status === 'active').map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      price: Number(c.price)
    }));
  }, [customers]);

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

  // Calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = monthStart.getDay();

  // Create empty slots for days before the month starts
  const emptySlots = Array(startDayOfWeek).fill(null);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
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
    await rescheduleJob(jobId, newDate);
    setSelectedJob(null);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-10 w-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-10 w-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
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
                {/* Empty slots */}
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
                        !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
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
            </div>

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
                        onClick={() => setQuickScheduleOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Quick Schedule
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

      {/* Floating Action Button */}
      {selectedDate && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-24 right-4 z-40"
        >
          <Button
            size="icon"
            onClick={() => setQuickScheduleOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      <RescheduleJobModal
        job={selectedJob}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onReschedule={handleReschedule}
      />

      {selectedDate && (
        <QuickScheduleModal
          open={quickScheduleOpen}
          onOpenChange={setQuickScheduleOpen}
          selectedDate={selectedDate}
          customers={activeCustomers}
          bookedCustomerIds={selectedDateJobs.map(job => job.customer_id)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Calendar;
