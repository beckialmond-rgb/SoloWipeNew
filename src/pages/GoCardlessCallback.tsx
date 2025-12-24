import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GoCardlessCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetchAll } = useSupabaseData();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions using ref (not state to avoid dependency issues)
      if (isProcessingRef.current) {
        console.log('[GC-CALLBACK-PAGE] Already processing, skipping');
        return;
      }

      isProcessingRef.current = true;

      try {
        // Step 1: Read URL parameters (authorization code from GoCardless)
        // Read from URL directly to avoid stale closure issues
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const stateParam = urlParams.get('state');
        
        // Check if this code has already been processed (idempotency)
        if (code && processedCodeRef.current === code) {
          console.log('[GC-CALLBACK-PAGE] Code already processed, skipping');
          isProcessingRef.current = false;
          return;
        }
        
        // Store the code to prevent re-processing
        if (code) {
          processedCodeRef.current = code;
        }
        
        // Clear URL params immediately to prevent re-processing on re-render
        window.history.replaceState({}, '', window.location.pathname);

        console.log('[GC-CALLBACK-PAGE] === CALLBACK HANDLER STARTED ===');
        console.log('[GC-CALLBACK-PAGE] Code from URL:', code ? `${code.substring(0, 10)}...` : 'MISSING');
        console.log('[GC-CALLBACK-PAGE] Error from URL:', errorParam);
        console.log('[GC-CALLBACK-PAGE] State from URL:', stateParam);

        // Step 2: Retrieve session token and user ID from localStorage
        const sessionToken = localStorage.getItem('gocardless_session_token');
        let storedUserId = localStorage.getItem('gocardless_user_id');
        let redirectUrl = localStorage.getItem('gocardless_redirect_url');

        // Fallback: Extract user ID from state parameter if localStorage is missing
        if (!storedUserId && stateParam) {
          try {
            const stateData = JSON.parse(atob(stateParam));
            if (stateData.userId) {
              storedUserId = stateData.userId;
              console.log('[GC-CALLBACK-PAGE] Extracted user ID from state parameter:', storedUserId);
            }
          } catch (e) {
            console.warn('[GC-CALLBACK-PAGE] Failed to parse state parameter:', e);
          }
        }

        // Fallback: Construct redirect URL if missing from localStorage
        // Always use the callback route, regardless of current page
        if (!redirectUrl) {
          const isProduction = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
          redirectUrl = isProduction 
            ? 'https://solowipe.co.uk/gocardless-callback'
            : `${window.location.origin}/gocardless-callback`;
          console.log('[GC-CALLBACK-PAGE] Constructed redirect URL from fallback:', redirectUrl);
        }

        console.log('[GC-CALLBACK-PAGE] Session token from localStorage:', sessionToken ? 'Present' : 'MISSING');
        console.log('[GC-CALLBACK-PAGE] User ID from localStorage/state:', storedUserId || 'MISSING');
        console.log('[GC-CALLBACK-PAGE] Redirect URL from localStorage/page:', redirectUrl || 'MISSING');

        // Step 3: Error handling - check for GoCardless errors first
        if (errorParam) {
          console.error('[GC-CALLBACK-PAGE] ❌ GoCardless returned an error:', errorParam, errorDescription);
          
          // Check if this is a redirect URI mismatch error
          const isRedirectUriError = errorParam.includes('redirect_uri') || 
                                     errorDescription?.includes('redirect_uri') ||
                                     errorDescription?.includes('redirect');
          
          let errorMsg = `Authorization failed: ${errorParam}. ${errorDescription || 'No description provided'}`;
          
          if (isRedirectUriError) {
            const redirectUrl = localStorage.getItem('gocardless_redirect_url') || 
              (() => {
                const isProduction = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
                return isProduction 
                  ? 'https://solowipe.co.uk/gocardless-callback'
                  : `${window.location.origin}/gocardless-callback`;
              })();
            
            errorMsg = `Redirect URI mismatch. The redirect URI must exactly match what's registered in your GoCardless Dashboard.`;
            
            console.error('[GC-CALLBACK-PAGE] ❌ REDIRECT URI MISMATCH');
            console.error('[GC-CALLBACK-PAGE] Redirect URI that was sent:', redirectUrl);
            console.error('[GC-CALLBACK-PAGE] ⚠️ ACTION REQUIRED:');
            console.error('[GC-CALLBACK-PAGE] 1. Go to: https://manage.gocardless.com/settings/api');
            console.error('[GC-CALLBACK-PAGE] 2. Find "Redirect URIs" section');
            console.error('[GC-CALLBACK-PAGE] 3. Add this EXACT URL:', redirectUrl);
            console.error('[GC-CALLBACK-PAGE] 4. Make sure: NO trailing slash, correct protocol, correct hostname');
          }
          
          setStatus('error');
          setErrorMessage(errorMsg);
          
          // Clean up localStorage
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          
          toast({
            title: 'GoCardless authorization failed',
            description: isRedirectUriError 
              ? 'Redirect URI mismatch. Check browser console for the exact URL to add to GoCardless Dashboard.'
              : (errorDescription || errorParam),
            variant: 'destructive',
            duration: 10000,
          });
          
          // Redirect to settings after a delay
          setTimeout(() => {
            navigate('/settings');
          }, 5000); // Longer delay for redirect URI errors so user can read console
          return;
        }

        // Step 4: Validate required data
        if (!code) {
          console.error('[GC-CALLBACK-PAGE] ❌ No authorization code in URL');
          setStatus('error');
          setErrorMessage('No authorization code received from GoCardless. Please try connecting again.');
          
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          
          toast({
            title: 'Connection failed',
            description: 'No authorization code received. Please try connecting again.',
            variant: 'destructive',
          });
          
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
          return;
        }

        // Step 5: Validate user ID (required) - session token is optional but preferred
        if (!storedUserId) {
          console.error('[GC-CALLBACK-PAGE] ❌ User ID missing from localStorage and state parameter');
          console.error('[GC-CALLBACK-PAGE] This indicates the redirect flow was interrupted or expired');
          setStatus('error');
          setErrorMessage('Connection session expired. The redirect may have been interrupted. Please try connecting again from Settings.');
          
          toast({
            title: 'Connection expired',
            description: 'Please try connecting again from Settings.',
            variant: 'destructive',
          });
          
          // Redirect immediately to settings
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
          return;
        }

        // Log warning if session token is missing but continue anyway
        if (!sessionToken) {
          console.warn('[GC-CALLBACK-PAGE] ⚠️ Session token missing from localStorage, but continuing with state-based validation');
        }

        // Step 6: Verify redirect URL matches (using constructed URL if localStorage was missing)
        if (!redirectUrl) {
          console.error('[GC-CALLBACK-PAGE] ❌ Redirect URL could not be determined');
          setStatus('error');
          setErrorMessage('Redirect URL missing. Please try connecting again.');
          
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
          return;
        }

        // Validate redirect URL - ensure it points to the callback route, not settings
        const currentPath = window.location.pathname.split('?')[0]; // Remove query params
        const expectedCallbackPath = '/gocardless-callback';
        
        // If redirect URL doesn't match the callback route, fix it
        if (!redirectUrl.includes('gocardless-callback')) {
          console.warn('[GC-CALLBACK-PAGE] ⚠️ Redirect URL does not point to callback route, correcting:', redirectUrl);
          redirectUrl = window.location.origin + expectedCallbackPath;
          console.log('[GC-CALLBACK-PAGE] Corrected redirect URL:', redirectUrl);
        }

        // Extract base URL without query params for comparison
        const redirectBaseUrl = redirectUrl.split('?')[0];
        const actualBaseUrl = window.location.origin + currentPath;

        // Verify we're on the callback page
        if (currentPath !== expectedCallbackPath && !currentPath.includes('gocardless-callback')) {
          console.error('[GC-CALLBACK-PAGE] ❌ Not on callback route:', currentPath);
          setStatus('error');
          setErrorMessage('Invalid callback route. Please try connecting again.');
          
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
          return;
        }

        // Step 7: Verify authenticated user matches state (if available)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && storedUserId && currentUser.id !== storedUserId) {
          console.error('[GC-CALLBACK-PAGE] ❌ User ID mismatch:', {
            current: currentUser.id,
            expected: storedUserId,
          });
          setStatus('error');
          setErrorMessage('User mismatch. Please try connecting again.');
          
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
          return;
        }

        // Step 8: Call the callback Edge Function to complete the connection
        console.log('[GC-CALLBACK-PAGE] ✅ All validations passed, calling callback function...');
        console.log('[GC-CALLBACK-PAGE] Using redirect URL:', redirectUrl);
        
        const { data, error } = await supabase.functions.invoke('gocardless-callback', {
          body: { 
            code, 
            redirectUrl,
            sessionToken, // Pass session token if available (optional)
          },
        });

        console.log('[GC-CALLBACK-PAGE] Callback response:', { data, error });

        // Check for error in response data (non-2xx responses from Supabase functions)
        if (data?.error && !error) {
          console.error('[GC-CALLBACK-PAGE] ❌ Error found in response data (non-2xx status):', data.error);
          throw new Error(data.error || 'GoCardless connection failed');
        }

        if (error) {
          console.error('[GC-CALLBACK-PAGE] ❌ Callback function error:', error);
          throw error;
        }
        
        // Verify success response
        if (!data?.success) {
          console.error('[GC-CALLBACK-PAGE] ❌ Callback function did not return success');
          throw new Error('GoCardless connection failed. Please try again.');
        }

        // Step 9: Success - clean up and redirect
        console.log('[GC-CALLBACK-PAGE] ✅ Connection successful!');
        
        // Clear expired token flag since connection is now fresh
        localStorage.removeItem('gocardless_token_expired');
        localStorage.removeItem('gocardless_token_expired_time');
        
        setStatus('success');
        
        // Clean up localStorage
        localStorage.removeItem('gocardless_session_token');
        localStorage.removeItem('gocardless_user_id');
        localStorage.removeItem('gocardless_redirect_url');
        localStorage.removeItem('gocardless_state');
        
        // Refresh data to get updated profile with new connection timestamp
        await refetchAll();
        
        // Force clear expired flags again after refresh (in case they were set during the refresh)
        localStorage.removeItem('gocardless_token_expired');
        localStorage.removeItem('gocardless_token_expired_time');
        console.log('[GC-CALLBACK-PAGE] ✅ Expired flags cleared after connection');
        
        toast({
          title: 'GoCardless connected!',
          description: 'You can now set up Direct Debits for your customers.',
        });

        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate('/settings');
        }, 2000);

      } catch (error: unknown) {
        console.error('[GC-CALLBACK-PAGE] ❌ Callback error:', error);
        setStatus('error');
        
        const errorMsg = error instanceof Error 
          ? error.message 
          : 'Failed to connect GoCardless. Please try again.';
        setErrorMessage(errorMsg);
        
        // Clean up localStorage on error
        localStorage.removeItem('gocardless_session_token');
        localStorage.removeItem('gocardless_user_id');
        localStorage.removeItem('gocardless_redirect_url');
        localStorage.removeItem('gocardless_state');
        
        toast({
          title: 'Connection failed',
          description: errorMsg,
          variant: 'destructive',
        });
        
        // Redirect to settings after a delay
        setTimeout(() => {
          navigate('/settings');
        }, 3000);
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleCallback();
  }, [navigate, toast, refetchAll]); // Removed searchParams and isProcessing from deps to prevent loops

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {status === 'processing' && 'Connecting GoCardless...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we complete the connection.'}
            {status === 'success' && 'Your GoCardless account has been connected successfully.'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing authorization...</span>
              </div>
              <Button 
                onClick={() => navigate('/settings')}
                className="w-full"
                variant="outline"
              >
                Go to Settings
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You will be redirected to Settings shortly.
              </p>
              <Button 
                onClick={() => navigate('/settings')}
                className="w-full"
                variant="default"
              >
                Go to Settings Now
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                {errorMessage || 'An error occurred during the connection process.'}
              </p>
              <Button 
                onClick={() => navigate('/settings')}
                className="w-full"
                variant="default"
              >
                Return to Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

