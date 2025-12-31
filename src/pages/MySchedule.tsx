import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useHelperSchedule } from '@/hooks/useHelperSchedule';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const MySchedule = () => {
  const navigate = useNavigate();
  const { helperSchedule, isLoadingHelperSchedule } = useHelperSchedule();
  const { isHelper } = useRole();

  // Redirect if not helper
  if (!isHelper) {
    navigate('/', { replace: true });
    return null;
  }

  // Sort schedule by day of week
  const sortedSchedule = [...helperSchedule].sort((a, b) => {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
  });

  if (isLoadingHelperSchedule) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading your schedule..." />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-4 max-w-2xl mx-auto">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-primary" />
            My Schedule
          </h1>
          <p className="text-muted-foreground">
            View your weekly schedule and assigned rounds
          </p>
        </motion.div>

        {/* Schedule List */}
        {sortedSchedule.length === 0 ? (
          <EmptyState
            title="No schedule assigned"
            description="Your owner hasn't assigned you to any days yet. Check back later!"
            icon={<Calendar className="w-12 h-12 text-primary" />}
          />
        ) : (
          <div className="space-y-3">
            {sortedSchedule.map((schedule, index) => (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border shadow-sm p-4"
              >
                <div className="flex items-center gap-3">
                  {/* Day */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground text-lg">
                        {DAY_LABELS[schedule.day_of_week] || schedule.day_of_week}
                      </span>
                    </div>
                    
                    {/* Round Name */}
                    {schedule.round_name ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-sm">{schedule.round_name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No round assigned</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary */}
        {sortedSchedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sortedSchedule.length * 0.05 }}
            className="mt-6 p-4 bg-muted/50 rounded-xl border border-border"
          >
            <p className="text-sm text-muted-foreground text-center">
              You're scheduled for <span className="font-semibold text-foreground">{sortedSchedule.length}</span> day{sortedSchedule.length !== 1 ? 's' : ''} per week
            </p>
          </motion.div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default MySchedule;

