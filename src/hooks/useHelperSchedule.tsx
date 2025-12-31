import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { HelperSchedule } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing helper schedules (Phase 8)
 * 
 * Provides:
 * - Fetch schedules for current owner (all helpers)
 * - Fetch schedule for current helper (own schedule)
 * - Save schedule mutation (overwrites existing)
 * - Delete schedule mutation
 */
export function useHelperSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch schedules for current owner (all helpers)
  const { data: ownerSchedules = [], isLoading: isLoadingOwnerSchedules } = useQuery({
    queryKey: ['helperSchedules', 'owner', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('helper_schedule')
        .select('*')
        .eq('owner_id', user.id)
        .order('helper_id', { ascending: true })
        .order('day_of_week', { ascending: true });
      
      if (error) {
        console.error('[useHelperSchedule] Error fetching owner schedules:', error);
        throw error;
      }
      
      return (data || []) as HelperSchedule[];
    },
    enabled: !!user,
  });

  // Fetch schedule for current helper (own schedule)
  const { data: helperSchedule = [], isLoading: isLoadingHelperSchedule } = useQuery({
    queryKey: ['helperSchedules', 'helper', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('helper_schedule')
        .select('*')
        .eq('helper_id', user.id)
        .order('day_of_week', { ascending: true });
      
      if (error) {
        console.error('[useHelperSchedule] Error fetching helper schedule:', error);
        throw error;
      }
      
      return (data || []) as HelperSchedule[];
    },
    enabled: !!user,
  });

  // Save schedule mutation (overwrites existing entries for selected days)
  const saveScheduleMutation = useMutation({
    mutationFn: async ({ 
      helperId, 
      selectedDays, 
      roundName 
    }: { 
      helperId: string; 
      selectedDays: string[]; 
      roundName?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Validate inputs
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const invalidDays = selectedDays.filter(day => !validDays.includes(day.toLowerCase()));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid day(s): ${invalidDays.join(', ')}`);
      }
      
      // Normalize day names to lowercase
      const normalizedDays = selectedDays.map(day => day.toLowerCase());
      
      // If no days selected, delete all schedule entries for this helper
      if (normalizedDays.length === 0) {
        const { error } = await supabase
          .from('helper_schedule')
          .delete()
          .eq('owner_id', user.id)
          .eq('helper_id', helperId);
        
        if (error) {
          console.error('[useHelperSchedule] Error deleting schedule:', error);
          throw error;
        }
        
        return { deleted: true };
      }
      
      // Delete existing schedule entries for selected days
      const { error: deleteError } = await supabase
        .from('helper_schedule')
        .delete()
        .eq('owner_id', user.id)
        .eq('helper_id', helperId)
        .in('day_of_week', normalizedDays);
      
      if (deleteError) {
        console.error('[useHelperSchedule] Error deleting existing schedule:', deleteError);
        throw deleteError;
      }
      
      // Insert new schedule entries
      const entries = normalizedDays.map(day => ({
        owner_id: user.id,
        helper_id: helperId,
        day_of_week: day,
        round_name: roundName?.trim() || null,
      }));
      
      const { data, error: insertError } = await supabase
        .from('helper_schedule')
        .insert(entries)
        .select();
      
      if (insertError) {
        console.error('[useHelperSchedule] Error inserting schedule:', insertError);
        throw insertError;
      }
      
      return data as HelperSchedule[];
    },
    onSuccess: (data, variables) => {
      // Invalidate both owner and helper queries
      queryClient.invalidateQueries({ queryKey: ['helperSchedules', 'owner', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['helperSchedules', 'helper', variables.helperId] });
      
      if (data === null || (Array.isArray(data) && data.length === 0)) {
        toast({
          title: 'Schedule cleared',
          description: 'Schedule has been cleared for this helper.',
        });
      } else {
        toast({
          title: 'Schedule saved',
          description: `Schedule updated for ${Array.isArray(data) ? data.length : 0} day${Array.isArray(data) && data.length !== 1 ? 's' : ''}.`,
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save schedule';
      toast({
        title: 'Failed to save schedule',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Delete schedule mutation (delete all entries for a helper)
  const deleteScheduleMutation = useMutation({
    mutationFn: async (helperId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('helper_schedule')
        .delete()
        .eq('owner_id', user.id)
        .eq('helper_id', helperId);
      
      if (error) {
        console.error('[useHelperSchedule] Error deleting schedule:', error);
        throw error;
      }
    },
    onSuccess: (_, helperId) => {
      queryClient.invalidateQueries({ queryKey: ['helperSchedules', 'owner', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['helperSchedules', 'helper', helperId] });
      toast({
        title: 'Schedule deleted',
        description: 'Schedule has been deleted.',
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete schedule';
      toast({
        title: 'Failed to delete schedule',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    // Owner queries
    ownerSchedules,
    isLoadingOwnerSchedules,
    
    // Helper queries
    helperSchedule,
    isLoadingHelperSchedule,
    
    // Mutations
    saveSchedule: saveScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    isSaving: saveScheduleMutation.isPending,
    isDeleting: deleteScheduleMutation.isPending,
  };
}

