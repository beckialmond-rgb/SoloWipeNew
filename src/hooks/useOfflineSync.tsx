import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mutationQueue, localData, OfflineMutation, syncStatus } from '@/lib/offlineStorage';
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

  // Track if we've already warned about large queue to avoid spam
  const hasWarnedRef = useRef(false);
  
  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await mutationQueue.count();
    const previousCount = pendingCount;
    setPendingCount(count);
    
    // Warn user if queue crosses the threshold (only once)
    if (count >= 50 && previousCount < 50 && isOnline && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: 'Large offline queue',
        description: `You have ${count} pending changes. Please sync now to avoid data loss.`,
        variant: 'destructive',
        duration: 5000,
      });
    }
    
    // Reset warning flag if queue drops below threshold
    if (count < 50) {
      hasWarnedRef.current = false;
    }
  }, [isOnline, pendingCount]);

  // Process a single mutation
  const processMutation = useCallback(async (mutation: OfflineMutation): Promise<boolean> => {
    try {
      switch (mutation.type) {
        case 'completeJob': {
          const { jobId, customAmount, photoUrl, customerData } = mutation.payload as {
            jobId: string;
            customAmount?: number;
            photoUrl?: string;
            customerData: {
              customer_id: string;
              frequency_weeks: number | null;
              price: number;
              gocardless_id?: string;
              gocardless_mandate_status?: string | null;
              scheduled_date?: string;
            };
          };

          const now = new Date();
          const completedAt = now.toISOString();
          // Check if customer has ACTIVE Direct Debit mandate (not just gocardless_id)
          const hasActiveMandate = customerData.gocardless_mandate_status === 'active' && !!customerData.gocardless_id;
          const isGoCardless = hasActiveMandate;
          const amountCollected = customAmount ?? customerData.price;

          // Calculate helper payment amount (revenue split)
          // Check BEFORE cleanup to see if completer was assigned as helper
          let helperPaymentAmount: number | null = null;
          
          try {
            // Get current user ID (completer)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser?.id) {
              // Check if completer is a helper (assigned to this job)
              const { data: assignmentCheck } = await supabase
                .from('job_assignments')
                .select('assigned_to_user_id')
                .eq('job_id', jobId)
                .eq('assigned_to_user_id', currentUser.id)
                .maybeSingle();
              
              const isHelperCompleter = !!assignmentCheck;
              
              if (isHelperCompleter) {
                // Fetch customer to get owner_id (profile_id)
                const { data: customer } = await supabase
                  .from('customers')
                  .select('profile_id')
                  .eq('id', customerData.customer_id)
                  .maybeSingle();
                
                if (customer?.profile_id) {
                  // Fetch commission percentage from team_members
                  const { data: teamMember } = await supabase
                    .from('team_members')
                    .select('commission_percentage')
                    .eq('owner_id', customer.profile_id)
                    .eq('helper_id', currentUser.id)
                    .maybeSingle();
                  
                  if (teamMember && teamMember.commission_percentage > 0) {
                    const commission = teamMember.commission_percentage / 100;
                    // Round to 2 decimal places
                    helperPaymentAmount = Math.round(amountCollected * commission * 100) / 100;
                    console.log(`[Offline Sync] Helper payment calculated: £${amountCollected} × ${teamMember.commission_percentage}% = £${helperPaymentAmount}`);
                  }
                }
              }
            }
          } catch (revenueSplitError) {
            // Non-critical: log error but don't fail job completion
            console.error('[Offline Sync] Failed to calculate helper payment:', revenueSplitError);
            // Continue with helperPaymentAmount = null (no payment)
          }

          // Update current job
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              status: 'completed',
              completed_at: completedAt,
              amount_collected: amountCollected,
              payment_status: isGoCardless ? 'processing' : 'unpaid',
              payment_method: isGoCardless ? 'gocardless' : null,
              payment_date: null, // Only set when paid_out (via webhook)
              photo_url: photoUrl || null,
              helper_payment_amount: helperPaymentAmount,
            })
            .eq('id', jobId)
            .eq('status', 'pending');

          if (updateError) throw updateError;

          // Clean up assignment - job is completed, assignment no longer needed
          try {
            await supabase
              .from('job_assignments')
              .delete()
              .eq('job_id', jobId);
          } catch (assignmentError) {
            // Non-critical - log but don't fail job completion
            console.warn('[Offline Sync] Failed to cleanup assignment:', assignmentError);
          }

          // Check for frequency - if missing or null, treat as 'One-off' and don't reschedule
          const frequencyWeeks = customerData.frequency_weeks;
          const shouldReschedule = frequencyWeeks != null && frequencyWeeks > 0;
          
          if (!shouldReschedule) {
            console.log(`[Offline Sync] Customer ID ${customerData.customer_id} has no frequency (${frequencyWeeks}), treating as One-off. No reschedule.`);
            break;
          }

          // Validate scheduled_date if provided
          let baseDate = now;
          if (customerData.scheduled_date) {
            try {
              const parsedDate = new Date(customerData.scheduled_date);
              if (!isNaN(parsedDate.getTime())) {
                baseDate = parsedDate;
              } else {
                console.error(`[Offline Sync] Invalid scheduled_date for customer ID ${customerData.customer_id}:`, customerData.scheduled_date);
              }
            } catch (dateError) {
              console.error(`[Offline Sync] Error parsing scheduled_date for customer ID ${customerData.customer_id}:`, dateError);
            }
          }

          // Create future job only if rescheduling
          try {
            const nextDate = addWeeks(baseDate, frequencyWeeks);
            const nextScheduledDate = format(nextDate, 'yyyy-MM-dd');
            
            const { error: insertError } = await supabase
              .from('jobs')
              .insert({
                customer_id: customerData.customer_id,
                scheduled_date: nextScheduledDate,
                status: 'pending',
              });

            if (insertError) {
              console.error(`[Offline Sync] Failed to create next job for customer ID ${customerData.customer_id}:`, insertError);
              throw insertError;
            }
            
            console.log(`[Offline Sync] Successfully created next job for customer ID ${customerData.customer_id}: ${nextScheduledDate}`);
          } catch (rescheduleError) {
            console.error(`[Offline Sync] Failed to reschedule job for customer ID ${customerData.customer_id}:`, {
              frequency_weeks: frequencyWeeks,
              scheduled_date: customerData.scheduled_date,
              error: rescheduleError
            });
            // Don't fail the entire sync if rescheduling fails - job is already marked complete
          }
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
  }, []);

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
        syncStatus.setLastSynced(new Date().toISOString());
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
  }, [isOnline, processMutation, queryClient, success, updatePendingCount, warning]);

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
