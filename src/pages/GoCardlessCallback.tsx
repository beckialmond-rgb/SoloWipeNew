import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GoCardlessCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetchAll } = useSupabaseData();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent duplicate processing
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      try {
        // Step 1: Extract URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = urlParams.get('code') || hashParams.get('code');
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        const stateParam = urlParams.get('state') || hashParams.get('state');

        // Step 2: Handle GoCardless errors
        if (errorParam) {
          console.error('[GC-CALLBACK] GoCardless error:', errorParam, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || errorParam || 'Authorization failed');
          
          // Clean up
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          
          toast({
            title: 'Authorization failed',
            description: errorDescription || errorParam || 'Please try again.',
            variant: 'destructive',
          });
          
          setTimeout(() => navigate('/settings', { replace: true }), 3000);
          return;
        }

        // Step 3: If no code, check if already connected (silent success)
        if (!code) {
          console.log('[GC-CALLBACK] No code - checking if already connected...');
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('gocardless_access_token_encrypted, gocardless_connected_at')
                .eq('id', user.id)
                .single();
              
              if (profile?.gocardless_access_token_encrypted) {
                console.log('[GC-CALLBACK] ✅ Already connected - silent success');
                localStorage.removeItem('gocardless_session_token');
                localStorage.removeItem('gocardless_user_id');
                localStorage.removeItem('gocardless_redirect_url');
                localStorage.removeItem('gocardless_state');
                navigate('/settings', { replace: true });
                return;
              }
            }
          } catch (checkError) {
            console.warn('[GC-CALLBACK] Could not check connection:', checkError);
          }
          
          // No code and not connected - redirect silently (likely direct navigation)
          console.log('[GC-CALLBACK] No code and not connected - redirecting');
          navigate('/settings', { replace: true });
          return;
        }

        // Step 4: Process the authorization code
        console.log('[GC-CALLBACK] Processing authorization code...');
        
        // Get redirect URL from localStorage or construct it
        let redirectUrl = localStorage.getItem('gocardless_redirect_url');
        if (!redirectUrl) {
          const isProduction = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
          redirectUrl = isProduction 
            ? 'https://solowipe.co.uk/gocardless-callback'
            : `${window.location.origin}/gocardless-callback`;
        }

        // Clear URL params to prevent re-processing
        window.history.replaceState({}, '', window.location.pathname);

        // Step 5: Call the callback Edge Function
        const { data, error } = await supabase.functions.invoke('gocardless-callback', {
          body: { 
            code,
            redirectUrl,
            state: stateParam || undefined, // Include state if present
          },
        });

        // Step 6: Handle response
        if (error || data?.error) {
          const errorMsg = data?.error || error?.message || 'Connection failed';
          console.error('[GC-CALLBACK] Callback function error:', errorMsg);
          
          // Check if it's actually a success (already connected)
          if (data?.alreadyConnected || data?.success) {
            console.log('[GC-CALLBACK] ✅ Already connected (from function response)');
            setStatus('success');
            toast({
              title: '✅ GoCardless connected!',
              description: 'Your account is already connected.',
            });
            refetchAll().catch(() => {});
            setTimeout(() => navigate('/settings?connection_attempt=true', { replace: true }), 1500);
            return;
          }
          
          setStatus('error');
          setErrorMessage(errorMsg);
          toast({
            title: 'Connection failed',
            description: errorMsg,
            variant: 'destructive',
          });
          
          setTimeout(() => navigate('/settings', { replace: true }), 3000);
          return;
        }

        // Step 7: Success
        if (data?.success) {
          console.log('[GC-CALLBACK] ✅ Connection successful!');
          setStatus('success');
          
          // Clean up
          localStorage.removeItem('gocardless_session_token');
          localStorage.removeItem('gocardless_user_id');
          localStorage.removeItem('gocardless_redirect_url');
          localStorage.removeItem('gocardless_state');
          localStorage.removeItem('gocardless_token_expired');
          localStorage.removeItem('gocardless_token_expired_time');
          
          toast({
            title: '✅ GoCardless connected!',
            description: 'Your account has been connected successfully.',
          });
          
          // Refresh and redirect with connection_attempt flag
          refetchAll().catch(() => {});
          setTimeout(() => navigate('/settings?connection_attempt=true', { replace: true }), 1500);
          return;
        }

        // Step 8: Unexpected response
        console.warn('[GC-CALLBACK] Unexpected response:', data);
        setStatus('error');
        setErrorMessage('Unexpected response. Please try again.');
        setTimeout(() => navigate('/settings', { replace: true }), 3000);

      } catch (error) {
        console.error('[GC-CALLBACK] Unexpected error:', error);
        
        // Check if connection exists before showing error
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('gocardless_access_token_encrypted')
              .eq('id', user.id)
              .single();
            
            if (profile?.gocardless_access_token_encrypted) {
              // Connection exists - silent success
              console.log('[GC-CALLBACK] ✅ Connection exists despite error - redirecting');
              navigate('/settings?connection_attempt=true', { replace: true });
              return;
            }
          }
        } catch {
          // Continue to error
        }
        
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        toast({
          title: 'Connection failed',
          description: 'Please try again from Settings.',
          variant: 'destructive',
        });
        
        setTimeout(() => navigate('/settings', { replace: true }), 3000);
      }
    };

    processCallback();
  }, [navigate, toast, refetchAll]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {status === 'processing' && 'Connecting GoCardless...'}
            {status === 'success' && 'Successfully Connected!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we connect your account...'}
            {status === 'success' && 'Your GoCardless account has been connected. Redirecting to settings...'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <Button 
              onClick={() => navigate('/settings')}
              className="w-full"
              variant="outline"
            >
              Go to Settings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
