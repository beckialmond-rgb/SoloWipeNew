import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Save, Loader2, User } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useHelperSchedule } from '@/hooks/useHelperSchedule';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { HelperSchedule as HelperScheduleType } from '@/types/database';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
] as const;

const HelperSchedule = () => {
  const navigate = useNavigate();
  const { helpers, helpersLoading } = useSupabaseData();
  const { ownerSchedules, isLoadingOwnerSchedules, saveSchedule, isSaving } = useHelperSchedule();
  const { isOwner } = useRole();

  // Redirect if not owner
  if (!isOwner) {
    navigate('/', { replace: true });
    return null;
  }

  // Group schedules by helper_id for easy lookup
  const schedulesByHelper = useMemo(() => {
    const grouped: Record<string, HelperScheduleType[]> = {};
    ownerSchedules.forEach(schedule => {
      if (!grouped[schedule.helper_id]) {
        grouped[schedule.helper_id] = [];
      }
      grouped[schedule.helper_id].push(schedule);
    });
    return grouped;
  }, [ownerSchedules]);

  // State for each helper's schedule form
  const [helperStates, setHelperStates] = useState<Record<string, {
    selectedDays: string[];
    roundName: string;
  }>>({});

  // Initialize state from existing schedules when they load
  useEffect(() => {
    const newStates: Record<string, { selectedDays: string[]; roundName: string }> = {};
    
    helpers.forEach(helper => {
      const schedules = schedulesByHelper[helper.id] || [];
      const days = schedules.map(s => s.day_of_week);
      // Get round name from first schedule (assuming same round for all days)
      const roundName = schedules.length > 0 ? (schedules[0].round_name || '') : '';
      
      newStates[helper.id] = {
        selectedDays: days,
        roundName: roundName,
      };
    });
    
    setHelperStates(prev => {
      // Only update if schedules actually changed
      const hasChanges = helpers.some(helper => {
        const schedules = schedulesByHelper[helper.id] || [];
        const days = schedules.map(s => s.day_of_week);
        const roundName = schedules.length > 0 ? (schedules[0].round_name || '') : '';
        const current = prev[helper.id];
        return !current || 
          JSON.stringify(current.selectedDays.sort()) !== JSON.stringify(days.sort()) ||
          current.roundName !== roundName;
      });
      
      return hasChanges ? newStates : prev;
    });
  }, [helpers, schedulesByHelper]);

  const handleDayToggle = (helperId: string, day: string) => {
    setHelperStates(prev => {
      const current = prev[helperId] || { selectedDays: [], roundName: '' };
      const selectedDays = current.selectedDays.includes(day)
        ? current.selectedDays.filter(d => d !== day)
        : [...current.selectedDays, day];
      
      return {
        ...prev,
        [helperId]: {
          ...current,
          selectedDays,
        },
      };
    });
  };

  const handleRoundNameChange = (helperId: string, roundName: string) => {
    setHelperStates(prev => {
      const current = prev[helperId] || { selectedDays: [], roundName: '' };
      return {
        ...prev,
        [helperId]: {
          ...current,
          roundName,
        },
      };
    });
  };

  const handleSaveSchedule = async (helperId: string) => {
    const state = helperStates[helperId];
    if (!state) return;

    try {
      await saveSchedule({
        helperId,
        selectedDays: state.selectedDays,
        roundName: state.roundName.trim() || undefined,
      });
    } catch (error) {
      console.error('[HelperSchedule] Error saving schedule:', error);
      // Error toast is handled by the hook
    }
  };

  const isLoading = helpersLoading || isLoadingOwnerSchedules;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading helper schedules..." />
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
            Helper Schedule
          </h1>
          <p className="text-muted-foreground">
            Assign helpers to specific days of the week with optional round names
          </p>
        </motion.div>

        {/* Helper List */}
        {helpers.length === 0 ? (
          <EmptyState
            title="No helpers yet"
            description="Add helpers from the job assignment picker to create schedules."
            icon={<User className="w-12 h-12 text-primary" />}
          />
        ) : (
          <div className="space-y-6">
            {helpers.map((helper, index) => {
              const state = helperStates[helper.id] || { selectedDays: [], roundName: '' };
              const hasChanges = state.selectedDays.length > 0;

              return (
                <motion.div
                  key={helper.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border shadow-sm p-5"
                >
                  {/* Helper Info */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {helper.initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-lg truncate">
                          {helper.name || helper.email}
                        </h3>
                        {helper.name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {helper.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day Checkboxes */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                      Days
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DAYS_OF_WEEK.map(day => {
                        const isSelected = state.selectedDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => handleDayToggle(helper.id, day.value)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-sm",
                              "border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Round Name Input */}
                  {hasChanges && (
                    <div className="mb-4">
                      <Label htmlFor={`round-${helper.id}`} className="text-sm font-medium text-muted-foreground mb-2 block">
                        Round Name <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input
                        id={`round-${helper.id}`}
                        type="text"
                        placeholder="e.g., North Round, South Round"
                        value={state.roundName}
                        onChange={(e) => handleRoundNameChange(helper.id, e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    onClick={() => handleSaveSchedule(helper.id)}
                    disabled={isSaving || !hasChanges}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Schedule
                      </>
                    )}
                  </Button>

                  {/* Current Schedule Display */}
                  {state.selectedDays.length === 0 && schedulesByHelper[helper.id]?.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      No schedule assigned
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default HelperSchedule;

