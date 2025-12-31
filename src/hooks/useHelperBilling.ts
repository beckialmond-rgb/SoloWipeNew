import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TeamMemberWithBilling } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export interface HelperBilling {
  id: string; // team_members.id
  helper_id: string; // User ID (or placeholder)
  helper_email: string;
  helper_name: string | null;
  is_active: boolean;
  billing_started_at: string | null;
  billing_stopped_at: string | null;
  stripe_subscription_item_id: string | null;
}

interface UseHelperBillingReturn {
  helpers: HelperBilling[];
  activeHelpers: HelperBilling[];
  inactiveHelpers: HelperBilling[];
  activateHelper: (helperId: string) => Promise<void>;
  deactivateHelper: (helperId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface ManageHelperBillingRequest {
  action: 'activate' | 'deactivate';
  helper_id: string;
}

interface ManageHelperBillingResponse {
  success: boolean;
  message?: string;
  subscription_item_id?: string | null;
  error?: string;
}

export function useHelperBilling(): UseHelperBillingReturn {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch team_members with billing fields
  const {
    data: helpers = [],
    isLoading,
    error,
    refetch,
  } = useQuery<HelperBilling[]>({
    queryKey: ['helperBilling', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error: queryError } = await supabase
        .from('team_members')
        .select(
          `
          id,
          helper_id,
          helper_email,
          helper_name,
          is_active,
          billing_started_at,
          billing_stopped_at,
          stripe_subscription_item_id
        `
        )
        .eq('owner_id', user.id)
        .order('is_active', { ascending: false })
        .order('billing_started_at', { ascending: false, nullsFirst: false });

      if (queryError) {
        console.error('[useHelperBilling] Error fetching helpers:', queryError);
        throw new Error(queryError.message || 'Failed to fetch helpers');
      }

      return (data || []).map((member: TeamMemberWithBilling) => ({
        id: member.id,
        helper_id: member.helper_id,
        helper_email: member.helper_email,
        helper_name: member.helper_name,
        is_active: member.is_active ?? true,
        billing_started_at: member.billing_started_at,
        billing_stopped_at: member.billing_stopped_at,
        stripe_subscription_item_id: member.stripe_subscription_item_id,
      }));
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Computed lists
  const activeHelpers = helpers.filter((h) => h.is_active);
  const inactiveHelpers = helpers.filter((h) => !h.is_active);

  // Mutation for activating/deactivating helpers
  const mutation = useMutation({
    mutationFn: async ({ action, helperId }: { action: 'activate' | 'deactivate'; helperId: string }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const requestBody: ManageHelperBillingRequest = {
        action,
        helper_id: helperId,
      };

      const { data, error: invokeError } = await supabase.functions.invoke<ManageHelperBillingResponse>(
        'manage-helper-billing',
        {
          body: requestBody,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // Log full error structure for debugging
      console.log('[useHelperBilling] Function response:', { 
        hasData: !!data, 
        hasError: !!invokeError,
        dataContent: data,
        dataStringified: data ? JSON.stringify(data, null, 2) : null,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
        errorContent: invokeError,
        errorStringified: invokeError ? JSON.stringify(invokeError, Object.getOwnPropertyNames(invokeError), 2) : null,
        errorType: invokeError?.constructor?.name,
        errorMessage: (invokeError as any)?.message,
        errorContext: (invokeError as any)?.context,
        errorContextBody: (invokeError as any)?.context?.body,
        errorContextResponse: (invokeError as any)?.context?.response,
        errorContextResponseData: (invokeError as any)?.context?.response?.data,
        errorContextResponseBody: (invokeError as any)?.context?.response?.body,
        errorKeys: invokeError ? Object.keys(invokeError) : [],
        errorContextKeys: (invokeError as any)?.context ? Object.keys((invokeError as any).context) : [],
      });

      // For non-2xx responses, Supabase may put error in data instead of error property
      // Handle both cases: error in error property OR error in data.error
      // IMPORTANT: Always check data first, even if invokeError exists, as Supabase may put response body in data
      if (invokeError || (data && typeof data === 'object' && ('error' in data || 'success' in data))) {
        let actualError: any = invokeError;
        let errorMessage = 'Failed to manage helper billing';
        
        // Priority 1: Check if error is in data (common for non-2xx responses)
        // IMPORTANT: Check data even if invokeError exists, as Supabase may put response body in data
        if (data && typeof data === 'object') {
          // Check data.error first (most common)
          if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
            console.log('[useHelperBilling] ✓ Found error in data.error:', errorMessage);
          } 
          // Check if data has success: false and error field
          else if ('success' in data && data.success === false && data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
            console.log('[useHelperBilling] ✓ Found error in data (success=false):', errorMessage);
          } 
          // Check if data itself is an error response object
          else if ('success' in data && data.success === false) {
            // Try to find any error-like field
            const errorFields = Object.keys(data).filter(k => k.toLowerCase().includes('error') || k.toLowerCase().includes('message'));
            if (errorFields.length > 0) {
              const firstErrorField = errorFields[0];
              const errorValue = (data as any)[firstErrorField];
              if (errorValue) {
                errorMessage = typeof errorValue === 'string' ? errorValue : (errorValue.message || JSON.stringify(errorValue));
                console.log(`[useHelperBilling] ✓ Found error in data.${firstErrorField}:`, errorMessage);
              }
            }
          }
          // If data exists but no error found, log it for debugging
          if (!errorMessage || errorMessage === 'Failed to manage helper billing') {
            console.log('[useHelperBilling] Data exists but no error found. Data keys:', Object.keys(data));
            console.log('[useHelperBilling] Full data object:', data);
          }
        }
        
        // Priority 2: Check context.body.error (for 403/400 errors)
        if (invokeError && (invokeError as any)?.context?.body?.error) {
          const bodyError = (invokeError as any).context.body.error;
          errorMessage = typeof bodyError === 'string' ? bodyError : bodyError.message || JSON.stringify(bodyError);
          console.log('[useHelperBilling] ✓ Found error in context.body.error:', errorMessage);
        }
        
        // Priority 3: Check context.response.data.error
        if (invokeError && (invokeError as any)?.context?.response?.data?.error) {
          const responseError = (invokeError as any).context.response.data.error;
          errorMessage = typeof responseError === 'string' ? responseError : responseError.message || JSON.stringify(responseError);
          console.log('[useHelperBilling] ✓ Found error in context.response.data.error:', errorMessage);
        }
        
        // Priority 4: Check context.response.body (raw response body)
        if (invokeError && (invokeError as any)?.context?.response?.body) {
          try {
            const responseBody = (invokeError as any).context.response.body;
            if (typeof responseBody === 'string') {
              const parsed = JSON.parse(responseBody);
              if (parsed.error) {
                errorMessage = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || JSON.stringify(parsed.error);
                console.log('[useHelperBilling] ✓ Found error in parsed context.response.body:', errorMessage);
              }
            } else if (responseBody?.error) {
              errorMessage = typeof responseBody.error === 'string' ? responseBody.error : responseBody.error.message || JSON.stringify(responseBody.error);
              console.log('[useHelperBilling] ✓ Found error in context.response.body:', errorMessage);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // Priority 5: Use invokeError.message as fallback
        if (!errorMessage || errorMessage === 'Failed to manage helper billing') {
          if (invokeError?.message) {
            errorMessage = invokeError.message;
            console.log('[useHelperBilling] ✓ Using invokeError.message:', errorMessage);
          }
        }
        
        console.error('[useHelperBilling] Function invoke error:', {
          originalError: invokeError ? JSON.stringify(invokeError, Object.getOwnPropertyNames(invokeError), 2) : null,
          dataError: data?.error,
          extractedMessage: errorMessage,
          errorMessageSource: 'See logs above for extraction details',
        });
        
        // If we still don't have a good error message, provide a more helpful default
        if (!errorMessage || errorMessage === 'Failed to manage helper billing' || errorMessage.includes('non-2xx') || errorMessage.includes('2xx')) {
          // Try to get status code from error
          const statusCode = (invokeError as any)?.status || 
                            (invokeError as any)?.context?.status || 
                            (invokeError as any)?.context?.response?.status ||
                            (invokeError as any)?.code;
          
          console.log('[useHelperBilling] Status code extracted:', statusCode);
          
          if (statusCode === 403 || (invokeError as any)?.message?.includes('403')) {
            // 403 can mean either "not owner" or "subscription not active"
            errorMessage = 'Access denied. Please ensure you are the owner and have an active subscription (not just trialing).';
          } else if (statusCode === 401 || (invokeError as any)?.message?.includes('401')) {
            errorMessage = 'Authentication failed. Please sign in again.';
          } else if (statusCode === 404 || (invokeError as any)?.message?.includes('404')) {
            errorMessage = 'Helper not found or access denied.';
          } else if (statusCode === 400 || (invokeError as any)?.message?.includes('400')) {
            // 400 errors usually mean bad request - check if we have more info
            if (data && typeof data === 'object' && 'error' in data) {
              errorMessage = typeof data.error === 'string' ? data.error : 'Invalid request. Please check the helper status.';
            } else {
              errorMessage = 'Invalid request. The helper may not have an active subscription item to deactivate.';
            }
          } else if (statusCode) {
            errorMessage = `Server error (${statusCode}). Please try again or contact support.`;
          } else {
            // Check if error message contains any clues
            const errorMsg = (invokeError as any)?.message || '';
            if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
              errorMessage = 'Access denied. Please ensure you are the owner and have an active subscription.';
            } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
              errorMessage = 'Authentication failed. Please sign in again.';
            } else {
              errorMessage = 'Failed to manage helper billing. Please check your subscription status and try again.';
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('No response from server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to manage helper billing');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch helper billing data
      queryClient.invalidateQueries({ queryKey: ['helperBilling', user?.id] });
    },
    onError: (error: Error) => {
      console.error('[useHelperBilling] Mutation error:', error);
      
      // Show user-friendly error messages
      let errorMessage = error.message || 'An error occurred';
      
      // Map common error messages to user-friendly ones
      if (errorMessage.includes('Only owners can manage') || errorMessage.includes('Only owners can')) {
        errorMessage = 'Only owners can manage helper billing';
      } else if (errorMessage.includes('active subscription') || errorMessage.includes('must have an active subscription')) {
        errorMessage = 'Your subscription must be active to manage helper billing';
      } else if (errorMessage.includes('not found') || errorMessage.includes('doesn\'t belong to owner')) {
        errorMessage = 'Helper not found or access denied';
      } else if (errorMessage.includes('already has') || errorMessage.includes('already have')) {
        errorMessage = 'Helper already has an active subscription item';
      } else if (errorMessage.includes('does not have') || errorMessage.includes('doesn\'t have')) {
        errorMessage = 'Helper does not have an active subscription item to deactivate';
      } else if (errorMessage.includes('Authorization required') || errorMessage.includes('Invalid authentication')) {
        errorMessage = 'Authentication failed. Please sign in again.';
      } else if (errorMessage.includes('Failed to connect') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Failed to connect. Please check your internet connection and try again.';
      } else if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('Server configuration')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (errorMessage.includes('verification failed')) {
        errorMessage = 'Deactivation verification failed. The helper may already be deactivated.';
      } else if (errorMessage.includes('Failed to delete subscription item')) {
        errorMessage = 'Failed to cancel billing. Please try again or contact support.';
      } else if (errorMessage.includes('Failed to update')) {
        errorMessage = 'Failed to update helper status. Please try again.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const activateHelper = async (helperId: string) => {
    await mutation.mutateAsync({ action: 'activate', helperId });
  };

  const deactivateHelper = async (helperId: string) => {
    await mutation.mutateAsync({ action: 'deactivate', helperId });
  };

  return {
    helpers,
    activeHelpers,
    inactiveHelpers,
    activateHelper,
    deactivateHelper,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['helperBilling', user?.id] });
    },
  };
}

