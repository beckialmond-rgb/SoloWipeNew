import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mutationQueue, localData, OfflineMutation } from '@/lib/offlineStorage';
import { useOnlineStatus } from './useOnlineStatus';
import { useHaptics } from './useHaptics';
import { toast } from '@/hooks/use-toast';
import { format, addWeeks } from 'date-fns';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const { isOnline, wasOffline, acknowledgeReconnection } = useOnlineStatus();
  const { lightTap, success, warning } = useHaptics();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await mutationQueue.count();
    setPendingCount(count);
  }, []);

  // Process a single mutation
  const processMutation = async (mutation: OfflineMutation): Promise<boolean> => {
    try {
      switch (mutation.type) {
        case 'completeJob': {
          const { jobId, customAmount, photoUrl, customerData } = mutation.payload as {
            jobId: string;
            customAmount?: number;
            photoUrl?: string;
            customerData: {
              customer_id: string;
              frequency_weeks: number;
              price: number;
              gocardless_id?: string;
            };
          };

          const now = new Date();
          const completedAt = now.toISOString();
          const nextDate = addWeeks(now, customerData.frequency_weeks);
          const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');
          const isGoCardless = !!customerData.gocardless_id;
          const amountCollected = customAmount ?? customerData.price;

          // Update current job
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              status: 'completed',
              completed_at: completedAt,
              amount_collected: amountCollected,
              payment_status: isGoCardless ? 'paid' : 'unpaid',
              payment_method: isGoCardless ? 'gocardless' : null,
              payment_date: isGoCardless ? completedAt : null,
              photo_url: photoUrl || null,
            })
            .eq('id', jobId)
            .eq('status', 'pending');

          if (updateError) throw updateError;

          // Create future job
          const { error: insertError } = await supabase
            .from('jobs')
            .insert({
              customer_id: customerData.customer_id,
              scheduled_date: nextScheduledDate,
              status: 'pending',
            });

          if (insertError) throw insertError;
          break;
        }

        case 'markJobPaid': {
          const { jobId, method } = mutation.payload as { jobId: string; method: 'cash' | 'transfer' };
          const { error } = await supabase
            .from('jobs')
            .update({
              payment_status: 'paid',
              payment_method: method,
              payment_date: new Date().toISOString(),
            })
            .eq('id', jobId)
            .eq('payment_status', 'unpaid');

          if (error) throw error;
          break;
        }

        case 'batchMarkPaid': {
          const { jobIds, method } = mutation.payload as { jobIds: string[]; method: 'cash' | 'transfer' };
          const { error } = await supabase
            .from('jobs')
            .update({
              payment_status: 'paid',
              payment_method: method,
              payment_date: new Date().toISOString(),
            })
            .in('id', jobIds)
            .eq('payment_status', 'unpaid');

          if (error) throw error;
          break;
        }

        case 'rescheduleJob': {
          const { jobId, newDate } = mutation.payload as { jobId: string; newDate: string };
          const { error } = await supabase
            .from('jobs')
            .update({ scheduled_date: newDate })
            .eq('id', jobId);

          if (error) throw error;
          break;
        }

        case 'skipJob': {
          const { jobId, newScheduledDate } = mutation.payload as { jobId: string; newScheduledDate: string };
          const { error } = await supabase
            .from('jobs')
            .update({ scheduled_date: newScheduledDate })
            .eq('id', jobId);

          if (error) throw error;
          break;
        }

        case 'updateJobNotes': {
          const { jobId, notes } = mutation.payload as { jobId: string; notes: string | null };
          const { error } = await supabase
            .from('jobs')
            .update({ notes })
            .eq('id', jobId);

          if (error) throw error;
          break;
        }

        default:
          console.warn('Unknown mutation type:', mutation.type);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to process mutation:', mutation.type, error);
      return false;
    }
  };

  // Sync all pending mutations
  const syncPendingMutations = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;
    
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const mutations = await mutationQueue.getAll();
      
      if (mutations.length === 0) {
        syncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const mutation of mutations) {
        const success = await processMutation(mutation);
        
        if (success) {
          await mutationQueue.remove(mutation.id);
          // Clean up optimistic data
          if ('jobId' in mutation.payload) {
            await localData.removeOptimisticJob(mutation.payload.jobId as string);
          }
          successCount++;
        } else {
          await mutationQueue.updateRetryCount(mutation.id);
          
          // Remove mutations that have failed too many times
          if (mutation.retryCount >= 3) {
            await mutationQueue.remove(mutation.id);
            failCount++;
          }
        }
      }

      // Refresh all queries after sync
      await queryClient.invalidateQueries();
      await updatePendingCount();

      if (successCount > 0) {
        success(); // Haptic feedback on successful sync
        toast({
          title: `Synced ${successCount} offline change${successCount > 1 ? 's' : ''}`,
          description: 'Your data is now up to date.',
        });
      }

      if (failCount > 0) {
        warning(); // Haptic warning on failed sync
        toast({
          title: `${failCount} change${failCount > 1 ? 's' : ''} failed to sync`,
          description: 'Some offline changes could not be saved.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, queryClient, updatePendingCount]);

  // Sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      syncPendingMutations();
      acknowledgeReconnection();
    }
  }, [wasOffline, isOnline, syncPendingMutations, acknowledgeReconnection]);

  // Initial pending count
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Queue a mutation for offline processing
  const queueMutation = useCallback(async (
    type: OfflineMutation['type'],
    payload: Record<string, unknown>
  ) => {
    lightTap(); // Haptic feedback when queuing offline action
    await mutationQueue.add({ type, payload });
    await updatePendingCount();
  }, [updatePendingCount, lightTap]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueMutation,
    syncPendingMutations,
    updatePendingCount,
  };
}
