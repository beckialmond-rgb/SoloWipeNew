import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, MapPin, Phone, Repeat, Pencil, Trash2, FileText, History, CreditCard, CheckCircle2, Loader2, Send, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { Customer, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { DirectDebitSetupModal } from '@/components/DirectDebitSetupModal';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { openSMSApp, prepareSMSContext } from '@/utils/openSMS';
import { AskForReviewButton } from '@/components/AskForReviewButton';

interface CustomerDetailModalProps {
  customer: Customer | null;
  businessName: string | null | undefined;
  profile?: Profile | null;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
  onArchive?: (customerId: string) => Promise<void>;
  onViewHistory?: (customer: Customer) => void;
  onRefresh?: () => void;
}

export function CustomerDetailModal({ customer, businessName, profile, onClose, onEdit, onArchive, onViewHistory, onRefresh }: CustomerDetailModalProps) {
  const { toast } = useToast();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDirectDebitSetup, setShowDirectDebitSetup] = useState(false);
  const [isSendingDDLink, setIsSendingDDLink] = useState(false);

  const isGoCardlessConnected = !!profile?.gocardless_organisation_id;
  const hasActiveMandate = !!customer?.gocardless_id;
  const isOpen = !!customer;

  // Force close function that always works - use useCallback to ensure stability
  const forceClose = useCallback(() => {
    console.log('[CustomerDetailModal] Force closing modal');
    setIsArchiving(false);
    setShowArchiveConfirm(false);
    onClose();
  }, [onClose]);

  // Escape key handler - always works
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsArchiving(false);
        setShowArchiveConfirm(false);
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [isOpen, onClose]);

  const { showTemplatePicker } = useSMSTemplateContext();

  const sendSmsReminder = () => {
    console.log('[CustomerDetailModal] Send SMS clicked', {
      hasPhone: !!customer?.mobile_phone,
      hasName: !!customer?.name,
      phone: customer?.mobile_phone,
    });
    
    if (!customer?.mobile_phone) {
      toast({
        title: 'No phone number',
        description: 'This customer doesn\'t have a phone number. Please add one to send SMS messages.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!customer?.name) {
      toast({
        title: 'Error',
        description: 'Customer name is missing',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Use text_customer_button trigger for consistency with general "Send Text" button
      // This ensures the same General Message templates are used
      const context = prepareSMSContext({
        customerName: customer.name,
        customerAddress: customer.address,
        businessName: businessName,
        price: customer.price,
      });
      
      console.log('[CustomerDetailModal] Calling showTemplatePicker', {
        triggerType: 'text_customer_button',
        context,
      });
      
      showTemplatePicker('text_customer_button', context, (message) => {
        console.log('[CustomerDetailModal] Template selected, opening SMS app', {
          phone: customer.mobile_phone,
          messageLength: message.length,
        });
        openSMSApp(customer.mobile_phone!, message);
      });
    } catch (error) {
      console.error('[CustomerDetailModal] Error in sendSmsReminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to open SMS template picker. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    // Defensive checks
    if (!onArchive) {
      console.error('[CustomerDetailModal] onArchive callback is missing');
      toast({
        title: 'Error',
        description: 'Archive function not available',
        variant: 'destructive',
      });
      forceClose();
      return;
    }
    
    if (!customer?.id) {
      console.error('[CustomerDetailModal] Customer ID is missing');
      toast({
        title: 'Error',
        description: 'Cannot archive: customer information missing',
        variant: 'destructive',
      });
      forceClose();
      return;
    }
    
    const customerId = customer.id;
    
    // FIX #1: Close modal BEFORE Supabase call to prevent UI deadlock
    // This removes the modal from DOM so it can't trap the UI
    setShowArchiveConfirm(false);
    setIsArchiving(false); // Reset state
    forceClose(); // Close modal immediately
    
    // Execute archive AFTER modal is closed (fire-and-forget)
    // This prevents any state sync issues from blocking the UI
    (async () => {
      try {
        console.log('[CustomerDetailModal] Starting archive for customer:', customerId);
        
        await onArchive(customerId);
        
        console.log('[CustomerDetailModal] Archive completed successfully');
        
        // FIX #2: Hard refresh after successful archive to prevent state sync deadlock
        // This ensures UI reflects database changes even if React state gets stuck
        setTimeout(() => {
          console.log('[CustomerDetailModal] Refreshing page after successful archive');
          window.location.reload();
        }, 500); // Small delay to let toast show
        
      } catch (error) {
        console.error('[CustomerDetailModal] Archive error:', error);
        // Error toast is already shown by archiveCustomer
        // Don't refresh on error - let user see the error
      }
    })();
  };

  const sendDDLinkViaSMS = async () => {
    if (!customer?.mobile_phone || !customer?.id || !customer?.name) {
      toast({
        title: 'Error',
        description: 'Customer has no phone number',
        variant: 'destructive',
      });
      return;
    }

    // Ensure profile exists (important for new Google OAuth users)
    if (!profile) {
      toast({
        title: 'Error',
        description: 'Profile not loaded. Please refresh the page and try again.',
        variant: 'destructive',
      });
      console.error('[DD Invite] Profile is missing - user may have just signed up');
      return;
    }

    setIsSendingDDLink(true);
    try {
      // Dynamically set redirect URLs based on environment
      const currentHostname = window.location.hostname;
      const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
      const REDIRECT_DOMAIN = isProduction ? 'https://solowipe.co.uk' : window.location.origin;
      const exitUrl = `${REDIRECT_DOMAIN}/customers`;
      const successUrl = `${REDIRECT_DOMAIN}/customers?mandate=success&customer=${customer.id}`;

      console.log('[DD Invite] Calling gocardless-create-mandate with:', {
        customerId: customer.id,
        customerName: customer.name,
        exitUrl,
        successUrl,
      });

      const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
        body: { 
          customerId: customer.id,
          customerName: customer.name,
          exitUrl,
          successUrl,
        }
      });

      console.log('[DD Invite] Function response:', { 
        hasData: !!data, 
        hasError: !!error,
        dataContent: JSON.stringify(data, null, 2),
        errorContent: error,
        errorType: error?.constructor?.name,
        errorStructure: error ? {
          message: (error as any)?.message,
          context: (error as any)?.context,
          hasContextBody: !!(error as any)?.context?.body,
          contextBodyKeys: (error as any)?.context?.body ? Object.keys((error as any).context.body) : [],
        } : null,
      });

      // For non-2xx responses, Supabase may put error in data instead of error property
      // Handle both cases: error in error property OR error in data.error
      if (error || data?.error) {
        // Use error from data if error property is empty
        // For non-2xx status, Supabase client puts error in data.error
        let actualError: any = error;
        
        // Check if error is in data (common for non-2xx responses)
        if (!actualError && data?.error) {
          // Create error-like object from data.error for consistent handling
          actualError = {
            message: data.error,
            context: {
              body: {
                error: data.error,
                requiresReconnect: data.requiresReconnect || false,
              },
              status: data.status || 400,
            }
          };
          console.log('[DD Invite] Error found in response data (non-2xx status):', data.error);
        }
        
        // Also check if data itself is an error object
        if (!actualError && typeof data === 'object' && data !== null && 'error' in data) {
          actualError = {
            message: data.error,
            context: {
              body: data,
              status: (data as any).status || 400,
            }
          };
          console.log('[DD Invite] Error found in data object:', data);
        }

        if (!actualError) {
          // Should not happen, but handle gracefully
          return;
        }
        console.error('[DD Invite] GoCardless mandate creation error:', {
          error: actualError,
          errorType: actualError?.constructor?.name,
          errorMessage: actualError instanceof Error ? actualError.message : String(actualError),
          errorContext: (actualError as any)?.context,
          errorDetails: JSON.stringify(actualError, null, 2),
          // Try to get error from response body
          responseError: (actualError as any)?.context?.body,
        });

        // Try to extract error message from response
        // For non-2xx status, Supabase may structure errors differently
        let errorMessage = 'Unknown error';
        try {
          const errorObj = actualError as any;
          
          console.log('[DD Invite] Full error structure:', {
            errorObj,
            hasContext: !!errorObj?.context,
            hasBody: !!errorObj?.context?.body,
            hasData: !!data,
            dataError: data?.error,
          });
          
          // Try multiple extraction strategies for non-2xx responses
          // For Supabase functions, errors can be in various locations
          
          // Strategy 1: Check data.error first (sometimes Supabase puts error in data for non-2xx)
          if (data?.error) {
            errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            console.log('[DD Invite] ✓ Found error in data.error:', errorMessage);
            
            // Also check for requiresReconnect flag
            if (data.requiresReconnect) {
              console.log('[DD Invite] ✓ Error requires reconnection');
            }
          }
          // Strategy 2: Check error.context.response.data (response body)
          else if (errorObj?.context?.response?.data?.error) {
            errorMessage = errorObj.context.response.data.error;
            console.log('[DD Invite] ✓ Found error in context.response.data.error:', errorMessage);
          }
          // Strategy 3: Check error.context.body.error (common Supabase error structure)
          else if (errorObj?.context?.body?.error) {
            errorMessage = errorObj.context.body.error;
            console.log('[DD Invite] ✓ Found error in context.body.error:', errorMessage);
          }
          // Strategy 4: Check error.context.data (another possible location)
          else if (errorObj?.context?.data?.error) {
            errorMessage = errorObj.context.data.error;
            console.log('[DD Invite] ✓ Found error in context.data.error:', errorMessage);
          }
          // Strategy 5: Check if context.body is the error object itself
          else if (typeof errorObj?.context?.body === 'string') {
            try {
              const parsedBody = JSON.parse(errorObj.context.body);
              if (parsedBody?.error) {
                errorMessage = parsedBody.error;
                console.log('[DD Invite] ✓ Found error in parsed context.body:', errorMessage);
              }
            } catch {
              // Not JSON, try as string
              errorMessage = errorObj.context.body;
              console.log('[DD Invite] ✓ Found error as context.body string:', errorMessage);
            }
          }
          // Strategy 6: Check error message (but skip generic non-2xx message)
          else if (errorObj?.message && !errorObj.message.includes('non-2xx')) {
            errorMessage = errorObj.message;
            console.log('[DD Invite] ✓ Found error in message:', errorMessage);
          }
          // Strategy 7: Check error context message
          else if (errorObj?.context?.message) {
            errorMessage = errorObj.context.message;
            console.log('[DD Invite] ✓ Found error in context.message:', errorMessage);
          }
          // Strategy 8: Standard Error object
          else if (actualError instanceof Error && actualError.message && !actualError.message.includes('non-2xx')) {
            errorMessage = actualError.message;
            console.log('[DD Invite] ✓ Using Error.message:', errorMessage);
          }
          // Strategy 9: Check nested error property
          else if (errorObj?.error) {
            errorMessage = typeof errorObj.error === 'string' ? errorObj.error : JSON.stringify(errorObj.error);
            console.log('[DD Invite] ✓ Found error in error property:', errorMessage);
          }
          // Strategy 10: For "non-2xx" error, check status code and provide helpful message
          else if (errorObj?.message?.includes('non-2xx') || errorObj?.message?.includes('401')) {
            // Try to extract status code from various locations
            const statusCode = errorObj?.context?.status || 
                              errorObj?.context?.response?.status || 
                              errorObj?.status || 
                              errorObj?.context?.statusCode ||
                              (errorObj?.context?.url ? 401 : null); // If we have URL, likely 401
            
            console.log('[DD Invite] Non-2xx error detected, checking status code:', statusCode);
            
            if (statusCode === 401 || errorObj?.message?.includes('401')) {
              errorMessage = 'GoCardless connection expired. Please reconnect in Settings.';
              console.log('[DD Invite] ✓ Inferred 401 error - connection expired');
            } else {
              errorMessage = 'GoCardless service error. Please try again or reconnect in Settings.';
              console.log('[DD Invite] ✓ Generic error for status:', statusCode);
            }
          }
          // Last resort: stringify or convert
          else if (typeof actualError === 'object' && actualError !== null) {
            errorMessage = JSON.stringify(errorObj, null, 2);
            console.log('[DD Invite] ⚠ Stringified error object:', errorMessage);
          } else {
            errorMessage = String(actualError);
            console.log('[DD Invite] ⚠ Converted error to string:', errorMessage);
          }
        } catch (e) {
          errorMessage = 'Failed to parse error message';
          console.error('[DD Invite] Error parsing failed:', e);
        }
        
        console.log('[DD Invite] Final extracted error message:', errorMessage);

        // Check for network/connection errors
        const errorMessageLower = errorMessage.toLowerCase();
        const errorStringLower = String(actualError).toLowerCase();
        
        if (errorMessage.includes('Failed to send') || 
            errorMessage.includes('fetch') || 
            errorMessage.includes('network') ||
            errorMessage.includes('NetworkError') ||
            errorStringLower.includes('unable to reach') ||
            errorStringLower.includes('connection') ||
            errorStringLower.includes('timeout')) {
          toast({
            title: 'Connection error',
            description: 'Unable to reach server. The Direct Debit function may not be deployed. Please contact support or try again later.',
            variant: 'destructive',
          });
          console.error('[DD Invite] Network error - Function may not be deployed:', {
            error: actualError,
            functionName: 'gocardless-create-mandate',
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            suggestion: 'Deploy function: npx supabase functions deploy gocardless-create-mandate',
          });
          return;
        }

        // Check if it's a connection expired error or access token not active
        const errorBody = actualError as { context?: { body?: { requiresReconnect?: boolean; error?: string }; status?: number; response?: { status?: number } } };
        const statusCode = errorBody?.context?.status || errorBody?.context?.response?.status;
        const is401 = statusCode === 401 || errorMessage.includes('401');
        
        if (errorBody?.context?.body?.requiresReconnect || 
            is401 ||
            errorMessage.includes('connection expired') ||
            errorMessage.includes('Access token not active') ||
            errorMessage.includes('access_token_not_active') ||
            errorMessage.includes('token expired') ||
            errorMessageLower.includes('token not active') ||
            errorMessageLower.includes('token expired') ||
            (errorMessage.includes('non-2xx') && is401)) {
          
          // Check if connection was recently established (within last 10 minutes)
          // If so, don't mark as expired - might be a temporary issue or validation error
          const connectedAt = profile?.gocardless_connected_at;
          if (connectedAt) {
            const connectionTime = new Date(connectedAt).getTime();
            const timeSinceConnection = Date.now() - connectionTime;
            const isRecentConnection = timeSinceConnection < 10 * 60 * 1000; // Within last 10 minutes
            
            if (isRecentConnection) {
              console.log('[DD Invite] ⚠️ Token validation failed but connection is recent (within 10 min) - might be temporary issue');
              console.log('[DD Invite] Connection time:', new Date(connectedAt).toISOString());
              console.log('[DD Invite] Time since connection:', Math.round(timeSinceConnection / 1000), 'seconds');
              
              // Don't mark as expired for recent connections - just show error
              toast({
                title: 'Connection validation failed',
                description: 'GoCardless connection was recently established but validation failed. This might be a temporary issue. Please try again, or check the browser console for details.',
                variant: 'destructive',
                duration: 10000,
              });
              
              // Log detailed error for debugging
              console.error('[DD Invite] Full error details:', {
                error,
                data,
                errorMessage,
                connectedAt: new Date(connectedAt).toISOString(),
                timeSinceConnection: Math.round(timeSinceConnection / 1000) + ' seconds',
              });
              
              return;
            }
          }
          
          // Only mark as expired if connection is NOT recent
          console.log('[DD Invite] Marking token as expired - connection is not recent');
          localStorage.setItem('gocardless_token_expired', 'true');
          localStorage.setItem('gocardless_token_expired_time', Date.now().toString());
          
          toast({
            title: 'GoCardless connection expired',
            description: 'Your GoCardless connection has expired. Please reconnect in Settings to continue using Direct Debit.',
            variant: 'destructive',
          });
          console.log('[DD Invite] GoCardless token expired - user needs to reconnect');
          
          // Trigger a refresh to update the UI
          if (onRefresh) {
            onRefresh();
          }
          return;
        }

        // Check for GoCardless not connected error
        if (errorMessage.includes('GoCardless not connected') || errorMessage.includes('not connected')) {
          toast({
            title: 'GoCardless not connected',
            description: 'Please connect GoCardless in Settings before inviting customers.',
            variant: 'destructive',
          });
          return;
        }

        // Check for function not found/deployed errors
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          toast({
            title: 'Function not available',
            description: 'The Direct Debit service is temporarily unavailable. Please try again later.',
            variant: 'destructive',
          });
          return;
        }

        // Extract detailed error message from various possible locations
        let serverError = errorMessage;
        try {
          const errorObj = error as any;
          
          // Try multiple ways to extract error message
          if (errorObj?.context?.body?.error) {
            // Error in response body (most common)
            serverError = errorObj.context.body.error;
          } else if (errorObj?.context?.message) {
            // Error message in context
            serverError = errorObj.context.message;
          } else if (errorObj?.message) {
            // Error message property
            serverError = errorObj.message;
          } else if (typeof errorObj === 'string') {
            // Error is a string
            serverError = errorObj;
          } else if (errorObj?.error) {
            // Nested error property
            serverError = errorObj.error;
          } else {
            // Try to stringify the whole error object
            try {
              const errorStr = JSON.stringify(errorObj, null, 2);
              if (errorStr !== '{}') {
                serverError = errorStr;
              }
            } catch {
              // Keep original errorMessage
            }
          }
          
          // Clean up error message
          serverError = serverError.replace(/^Error:\s*/i, '').trim();
        } catch (e) {
          // Keep the original errorMessage if extraction fails
          console.warn('[DD Invite] Failed to extract error details:', e);
        }

        // Show user-friendly error with more context
        const finalErrorMessage = serverError || errorMessage || 'Unable to generate Direct Debit setup link. Please try again.';
        
        toast({
          title: 'Failed to create invite',
          description: finalErrorMessage.length > 200 ? finalErrorMessage.substring(0, 200) + '...' : finalErrorMessage,
          variant: 'destructive',
          duration: 8000,
        });
        
        // Log full error for debugging
        console.error('[DD Invite] Full error details:', {
          error,
          data,
          extractedMessage: finalErrorMessage,
          serverError,
          errorMessage,
        });
        
        // Don't throw - we've shown the error to user
        return;
      }

      if (!data?.authorisationUrl) {
        throw new Error('No authorization URL returned from GoCardless');
      }

      // Check customer still exists before accessing properties
      if (!customer?.name || !customer?.mobile_phone) {
        toast({
          title: 'Error',
          description: 'Customer data unavailable',
          variant: 'destructive',
        });
        return;
      }

      // Show template picker with DD link
      // Ensure businessName has a fallback (important for new Google OAuth users)
      const safeBusinessName = businessName || profile?.business_name || 'My Window Cleaning';
      const context = prepareSMSContext({
        customerName: customer.name,
        ddLink: data.authorisationUrl,
        businessName: safeBusinessName,
      });
      
      // Only update status to 'pending' AFTER user confirms sending SMS
      // This prevents showing "pending" if user cancels the SMS picker
      showTemplatePicker('dd_invite_sms', context, async (message) => {
        // User confirmed sending SMS - now update status to pending
        try {
          const { error: updateError } = await supabase
            .from('customers')
            .update({ 
              gocardless_mandate_status: 'pending'
            })
            .eq('id', customer.id);

          if (updateError) {
            console.error('[DD Invite] Failed to update status to pending:', updateError);
            // Continue anyway - SMS will be sent, status can be updated later
          } else {
            console.log('[DD Invite] Status updated to pending after SMS confirmation');
          }
        } catch (updateErr) {
          console.error('[DD Invite] Error updating status:', updateErr);
          // Continue anyway - SMS will be sent
        }

        // Open SMS app with the message
        openSMSApp(customer.mobile_phone, message);
        
        // Show success toast
        toast({
          title: 'Invite sent!',
          description: 'SMS opened with Direct Debit setup link. Customer status updated to pending.',
        });
        
        // Refresh to show updated status
        onRefresh?.();
      });
    } catch (error: unknown) {
      console.error('[DD Invite] Failed to send DD link:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      let errorMessage = error instanceof Error 
        ? error.message 
        : (error as { message?: string })?.message || 'Failed to generate DD link';
      
      // Provide user-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to send')) {
        userMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        userMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        userMessage = 'Please log in again and try.';
      } else if (errorMessage.includes('GoCardless not connected')) {
        userMessage = 'GoCardless is not connected. Please connect in Settings.';
      }
      
      toast({
        title: 'Failed to send invite',
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSendingDDLink(false);
    }
  };

  // Early return if no customer to prevent crashes
  if (!isOpen || !customer) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="customer-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-sm"
            onClick={(e) => {
              // Always allow backdrop click to close, even during archiving
              e.preventDefault();
              e.stopPropagation();
              forceClose();
            }}
          >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col overflow-hidden"
            style={{ 
              bottom: '80px',
              maxHeight: 'calc(90vh - 80px)'
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Header with Edit button */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {onEdit && customer && (
                <button
                  onClick={() => onEdit(customer)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Edit customer"
                >
                  <Pencil className="w-5 h-5 text-primary" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  forceClose();
                }}
                className="p-2 rounded-full hover:bg-muted transition-colors z-10"
                aria-label="Close"
                disabled={false} // Always enabled
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 pb-32 pt-2 flex-1 overflow-y-auto safe-bottom min-h-0" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Customer Name */}
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {customer?.name || 'Unknown Customer'}
              </h2>

              {/* Contact Information Card */}
              <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                      {customer?.address ? (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:text-primary transition-colors break-words"
                        >
                          {customer.address}
                        </a>
                      ) : (
                        <p className="font-medium text-muted-foreground">No address</p>
                      )}
                    </div>
                  </div>

                  {customer?.mobile_phone ? (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${customer.mobile_phone.replace(/\s/g, '')}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {customer.mobile_phone}
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${customer.mobile_phone.replace(/\s/g, '')}`, '_self');
                            }}
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground/50 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                        <p className="font-medium text-muted-foreground text-sm">No phone number</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details Card */}
              <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Service</h3>
                <div className="flex items-start gap-3">
                  <Repeat className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Frequency</p>
                    <p className="font-medium text-foreground">
                      {customer?.frequency_weeks 
                        ? `Every ${customer.frequency_weeks} week${customer.frequency_weeks !== 1 ? 's' : ''}`
                        : 'One-off'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                    <p className="text-2xl font-bold text-foreground">
                      £{customer?.price ? customer.price.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {customer?.notes && (
                <div className="bg-warning/10 dark:bg-warning/20 rounded-xl border border-warning/30 dark:border-warning/40 p-4 mb-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-warning dark:text-warning mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-warning/80 dark:text-warning/90 mb-0.5 font-medium">Notes</p>
                      <p className="font-medium text-foreground whitespace-pre-wrap text-sm">{customer.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment & Actions Card */}
              <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment</h3>
                
                {isGoCardlessConnected && (
                  <>
                    {/* Mandate Status Display */}
                    {hasActiveMandate && customer?.gocardless_mandate_status === 'active' ? (
                      <div className="flex items-center gap-3 p-3 bg-success/10 dark:bg-success/20 rounded-lg border border-success/30 dark:border-success/40 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-success dark:text-success shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-success dark:text-success">Direct Debit Ready</p>
                          <p className="text-xs text-muted-foreground">Mandate active - payments collect automatically</p>
                        </div>
                      </div>
                    ) : customer?.gocardless_mandate_status === 'pending' ? (
                      <div className="flex items-center gap-3 p-3 bg-warning/10 dark:bg-warning/20 rounded-lg border border-warning/30 dark:border-warning/40 mb-3">
                        <Loader2 className="w-5 h-5 text-warning dark:text-warning shrink-0 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-warning dark:text-warning">Direct Debit Pending</p>
                          <p className="text-xs text-muted-foreground mb-1">Awaiting customer authorization</p>
                          <p className="text-xs text-muted-foreground/70 italic">
                            ⏱️ In sandbox mode, mandates take 1 business day to become active. In production, this is usually instant.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs h-7"
                            onClick={async () => {
                              if (!customer?.id) return;
                              
                              try {
                                const { data, error } = await supabase.functions.invoke('gocardless-check-mandate', {
                                  body: { customerId: customer.id },
                                });

                                if (error) {
                                  toast({
                                    title: 'Check failed',
                                    description: error.message || 'Failed to check mandate status',
                                    variant: 'destructive',
                                  });
                                  return;
                                }

                                if (data?.updated) {
                                  toast({
                                    title: 'Status updated',
                                    description: data.message || 'Mandate status refreshed',
                                  });
                                  if (onRefresh) {
                                    onRefresh();
                                  }
                                } else {
                                  toast({
                                    title: 'Status checked',
                                    description: data?.message || `Status is: ${data?.status || 'unknown'}`,
                                  });
                                  if (onRefresh) {
                                    onRefresh();
                                  }
                                }
                              } catch (err) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to check mandate status',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Check Status
                          </Button>
                        </div>
                      </div>
                    ) : customer?.gocardless_mandate_status === 'cancelled' || customer?.gocardless_mandate_status === 'expired' || customer?.gocardless_mandate_status === 'failed' ? (
                      <div className="flex items-center gap-3 p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/30 dark:border-destructive/40 mb-3">
                        <AlertCircle className="w-5 h-5 text-destructive dark:text-destructive shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-destructive dark:text-destructive">Direct Debit {customer.gocardless_mandate_status}</p>
                          <p className="text-xs text-muted-foreground">Please set up a new mandate</p>
                        </div>
                      </div>
                    ) : null}

                    {/* Setup Options - Always visible when GoCardless is connected */}
                    <div className="space-y-3">
                      {/* High-visibility one-tap invite button */}
                      {customer?.mobile_phone ? (
                        <Button
                          onClick={sendDDLinkViaSMS}
                          disabled={isSendingDDLink}
                          className={cn(
                            "w-full rounded-xl touch-sm min-h-[56px] gap-3 shadow-lg",
                            "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                            "text-primary-foreground font-semibold text-base",
                            "border-2 border-primary/20"
                          )}
                          size="lg"
                        >
                          {isSendingDDLink ? (
                            <>
                              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                              <span>Generating Invite...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5 shrink-0" />
                              <span>Invite to Direct Debit</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground text-center">
                            Add a phone number to send Direct Debit invites via SMS
                          </p>
                        </div>
                      )}
                      
                      {/* Manual setup option - Always visible */}
                      <Button
                        onClick={() => setShowDirectDebitSetup(true)}
                        variant="outline"
                        className={cn(
                          "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                          "border-border text-foreground",
                          "hover:bg-muted/50"
                        )}
                      >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">Manual Setup</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* View History Button */}
                {onViewHistory && customer && (
                  <Button
                    onClick={() => onViewHistory(customer)}
                    variant="outline"
                    className={cn(
                      "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                      "border-border text-foreground",
                      "hover:bg-muted"
                    )}
                  >
                    <History className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">View Job History</span>
                  </Button>
                )}

                {/* SMS Button */}
                {customer?.mobile_phone ? (
                  <Button
                    onClick={sendSmsReminder}
                    className={cn(
                      "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                      "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Send SMS</span>
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className={cn(
                      "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                      "opacity-50 cursor-not-allowed"
                    )}
                    title="No phone number available"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Send SMS</span>
                  </Button>
                )}

                {/* Ask for Review Button - only if google review link is configured */}
                {customer?.mobile_phone && profile?.google_review_link && (
                  <Button
                    onClick={() => {
                      const context = prepareSMSContext({
                        customerName: customer.name || 'Customer',
                        businessName: businessName,
                        review_link: profile.google_review_link || '',
                      });
                      showTemplatePicker('review_request', context, (message) => {
                        openSMSApp(customer.mobile_phone!, message);
                      });
                    }}
                    className={cn(
                      "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                      "bg-amber-500/15 dark:bg-amber-500/20",
                      "text-amber-700 dark:text-amber-300",
                      "border border-amber-500/30 dark:border-amber-500/40",
                      "hover:bg-amber-500/25 dark:hover:bg-amber-500/30",
                      "hover:border-amber-500/50 dark:hover:border-amber-500/60",
                      "font-semibold"
                    )}
                  >
                    <Star className="w-4 h-4 shrink-0 fill-amber-500/20" />
                    <span className="text-sm font-semibold">Ask for Review</span>
                  </Button>
                )}

                {/* Archive Button */}
                {onArchive && (
                  <Button
                    onClick={() => setShowArchiveConfirm(true)}
                    variant="outline"
                    className={cn(
                      "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                      "border-destructive text-destructive",
                      "hover:bg-destructive/10"
                    )}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Archive Customer</span>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirmation Dialog */}
      {/* CRITICAL: Only render AlertDialog when modal is actually open to prevent overlay persistence */}
      {isOpen && (
        <AlertDialog 
          open={showArchiveConfirm} 
          onOpenChange={(open) => {
            // Always allow dialog to close
            setShowArchiveConfirm(open);
            if (!open) {
              // If closing dialog, also reset archiving state
              setIsArchiving(false);
            }
          }}
        >
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {customer?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This customer will no longer appear in your list. Their scheduled jobs will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsArchiving(false);
                setShowArchiveConfirm(false);
                // Also close the main modal
                forceClose();
              }}
              disabled={false} // Always enabled
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Always call handleArchive - it has its own error handling
                handleArchive().catch((error) => {
                  console.error('[CustomerDetailModal] Unhandled error in handleArchive:', error);
                  // Force reset state if handleArchive fails catastrophically
                  setIsArchiving(false);
                  setShowArchiveConfirm(false);
                });
              }}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
      {/* Direct Debit Setup Modal */}
      {isOpen && customer && (
        <DirectDebitSetupModal
          customer={customer}
          isOpen={showDirectDebitSetup}
          onClose={() => setShowDirectDebitSetup(false)}
          businessName={businessName}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </>
  );
}
