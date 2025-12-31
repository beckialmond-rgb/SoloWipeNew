import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Link2Off, CheckCircle2, ExternalLink, Bug, RefreshCw, Wifi, WifiOff, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GoCardlessSectionProps {
  profile: Profile | null;
  onRefresh: () => void;
}

interface DebugLog {
  timestamp: string;
  action: string;
  details: string;
  status: 'info' | 'success' | 'error' | 'warning';
}

interface HealthCheckResult {
  status: 'ok' | 'error' | 'checking' | 'unknown';
  message: string;
  lastChecked: Date | null;
}

export function GoCardlessSection({ profile, onRefresh }: GoCardlessSectionProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult>({
    status: 'unknown',
    message: 'Not checked yet',
    lastChecked: null,
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = not checked, true = valid, false = expired
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);
  const [connectionVerificationMessage, setConnectionVerificationMessage] = useState<string | null>(null);
  const connectRequestRef = useRef<AbortController | null>(null); // Track active connection request
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  // Generate a unique session token
  const generateSessionToken = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `gc_${timestamp}_${random}`;
  };

  // Validate token by checking stored expiration state or testing connection
  // We'll check localStorage for recent expiration detection
  const checkTokenValidity = (): boolean | null => {
    if (!profile?.gocardless_access_token_encrypted) {
      return false;
    }

    // If we have a very recent connection (within last 10 minutes), ignore expired flag
    if (profile?.gocardless_connected_at) {
      const connectedAt = new Date(profile.gocardless_connected_at).getTime();
      const timeSinceConnection = Date.now() - connectedAt;
      if (timeSinceConnection < 10 * 60 * 1000) { // Within last 10 minutes
        // Connection is very recent, clear expired flag and assume valid
        const expiredFlag = localStorage.getItem('gocardless_token_expired');
        if (expiredFlag === 'true') {
          console.log('[GC] Recent connection detected (within 10 min) - clearing expired flag');
          localStorage.removeItem('gocardless_token_expired');
          localStorage.removeItem('gocardless_token_expired_time');
        }
        return null; // Assume valid for recent connections
      }
    }

    // Check if we've recently detected an expired token
    const lastExpirationCheck = localStorage.getItem('gocardless_token_expired');
    if (lastExpirationCheck === 'true') {
      // Check if it was recent (within last 5 minutes)
      const expirationTime = localStorage.getItem('gocardless_token_expired_time');
      if (expirationTime) {
        const timeSinceExpiration = Date.now() - parseInt(expirationTime, 10);
        if (timeSinceExpiration < 5 * 60 * 1000) { // 5 minutes
          return false; // Token was recently detected as expired
        } else {
          // Expiration is old, clear it
          localStorage.removeItem('gocardless_token_expired');
          localStorage.removeItem('gocardless_token_expired_time');
          console.log('[GC] Old expiration flag cleared');
        }
      }
    }

    // If no recent expiration detected, assume valid (will be validated when actually used)
    return null; // Unknown - will be validated when actually used
  };

  // Check both organisation ID and access token - if token is missing, connection is incomplete
  const hasToken = !!profile?.gocardless_access_token_encrypted;
  const hasOrgId = !!profile?.gocardless_organisation_id;
  
  // Check token validity from localStorage (set when errors occur)
  const tokenValidityCheck = checkTokenValidity();
  const isTokenExpired = tokenValidityCheck === false;
  const isConnected = hasOrgId && hasToken && !isTokenExpired;
  const hasPartialConnection = hasOrgId && !hasToken;
  const needsReconnect = hasOrgId && hasToken && isTokenExpired;

  const addDebugLog = (action: string, details: string, status: DebugLog['status'] = 'info') => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      details,
      status,
    };
    setDebugLogs(prev => [...prev, log]);
    console.log(`[GC-DEBUG] ${action}:`, details);
  };

  // Load debug mode from localStorage
  useEffect(() => {
    const debugEnabled = localStorage.getItem('gocardless_debug') === 'true';
    setShowDebug(debugEnabled);
  }, []);

  // Auto-polling when connection_attempt=true is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const connectionAttempt = urlParams.get('connection_attempt') === 'true';

    if (connectionAttempt) {
      // Remove the query parameter from URL
      const newSearch = new URLSearchParams(location.search);
      newSearch.delete('connection_attempt');
      const newUrl = location.pathname + (newSearch.toString() ? `?${newSearch.toString()}` : '');
      navigate(newUrl, { replace: true });

      // Start verification process
      setIsVerifyingConnection(true);
      setConnectionVerificationMessage('Verifying connection...');
      pollingStartTimeRef.current = Date.now();

      // Start polling immediately
      const checkConnection = async () => {
        // Refresh profile data
        onRefresh();
        
        // Wait a bit for the refresh to complete, then check profile
        // We'll check in the next effect cycle
      };

      // Run immediately
      checkConnection();

      // Then poll every 2 seconds
      pollingIntervalRef.current = setInterval(checkConnection, 2000);

      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingStartTimeRef.current = null;
      };
    }
  }, [location.search, navigate, onRefresh]);

  // Check connection status when profile updates during verification
  useEffect(() => {
    if (isVerifyingConnection && pollingStartTimeRef.current) {
      // Check if connection is now established
      const hasToken = !!profile?.gocardless_access_token_encrypted;
      const hasOrgId = !!profile?.gocardless_organisation_id;
      const tokenValidityCheck = checkTokenValidity();
      const isTokenExpired = tokenValidityCheck === false;
      const isConnected = hasOrgId && hasToken && !isTokenExpired;

      if (isConnected) {
        // Connection successful!
        setIsVerifyingConnection(false);
        setConnectionVerificationMessage(null);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingStartTimeRef.current = null;
        toast({
          title: '✅ GoCardless connected!',
          description: 'Your account has been successfully connected.',
        });
        return;
      }

      // Check if we've exceeded the timeout (10 seconds)
      if (pollingStartTimeRef.current) {
        const elapsed = Date.now() - pollingStartTimeRef.current;
        if (elapsed >= 10000) {
          // Timeout reached
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          pollingStartTimeRef.current = null;
          setConnectionVerificationMessage('Connection taking longer than usual, please refresh');
          // Keep isVerifyingConnection true to show the message
          toast({
            title: 'Connection taking longer than usual',
            description: 'Please refresh the page or click "Test" to check the connection status.',
            variant: 'default',
          });
        }
      }
    }
  }, [profile, isVerifyingConnection]);

  // Clear expired token flag when connection is refreshed or reconnected
  useEffect(() => {
    if (profile?.gocardless_connected_at) {
      // If we have a recent connection, clear any expired flags
      const lastExpiration = localStorage.getItem('gocardless_token_expired_time');
      const connectedAt = new Date(profile.gocardless_connected_at).getTime();
      const now = Date.now();
      
      // Clear if connection is newer than expiration, OR if connection is very recent (within last minute)
      const isRecentConnection = (now - connectedAt) < 60 * 1000; // Within last minute
      const isNewerThanExpiration = lastExpiration && parseInt(lastExpiration, 10) < connectedAt;
      
      if (isNewerThanExpiration || isRecentConnection) {
        // Connection is newer than expiration detection, or very recent - clear the flag
        localStorage.removeItem('gocardless_token_expired');
        localStorage.removeItem('gocardless_token_expired_time');
        addDebugLog('Token Status', `Expired flag cleared - connection refreshed (${isRecentConnection ? 'recent' : 'newer'})`, 'info');
        console.log('[GC] Cleared expired token flag - connection timestamp:', profile.gocardless_connected_at);
      }
    }
  }, [profile?.gocardless_connected_at, profile?.gocardless_access_token_encrypted]);

  // Clear expired token flag when connection is refreshed
  useEffect(() => {
    if (profile?.gocardless_connected_at) {
      // If we have a recent connection, clear any expired flags
      const lastExpiration = localStorage.getItem('gocardless_token_expired_time');
      const connectedAt = new Date(profile.gocardless_connected_at).getTime();
      if (lastExpiration && parseInt(lastExpiration, 10) < connectedAt) {
        // Connection is newer than expiration detection, clear the flag
        localStorage.removeItem('gocardless_token_expired');
        localStorage.removeItem('gocardless_token_expired_time');
      }
    }
  }, [profile?.gocardless_connected_at]);

  const toggleDebugMode = () => {
    const newValue = !showDebug;
    setShowDebug(newValue);
    localStorage.setItem('gocardless_debug', String(newValue));
    if (newValue) {
      addDebugLog('Debug Mode', 'Enabled', 'info');
    }
  };

  // Health check function to verify webhook endpoint
  const checkWebhookHealth = async () => {
    setIsCheckingHealth(true);
    addDebugLog('Health Check', 'Checking webhook endpoint...', 'info');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      const webhookUrl = `${supabaseUrl}/functions/v1/gocardless-webhook`;
      const response = await fetch(webhookUrl, { method: 'GET' });
      
      if (response.ok) {
        const data = await response.json();
        setHealthCheck({
          status: 'ok',
          message: data.message || 'Webhook endpoint is reachable',
          lastChecked: new Date(),
        });
        addDebugLog('Health Check', 'Webhook endpoint is healthy', 'success');
        toast({
          title: 'Connection healthy',
          description: 'Webhook endpoint is reachable and ready to receive events.',
        });
      } else {
        setHealthCheck({
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          lastChecked: new Date(),
        });
        addDebugLog('Health Check', `Failed: HTTP ${response.status}`, 'error');
        toast({
          title: 'Connection issue',
          description: 'Webhook endpoint returned an error. Check debug logs for details.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setHealthCheck({
        status: 'error',
        message,
        lastChecked: new Date(),
      });
      addDebugLog('Health Check', `Error: ${message}`, 'error');
      toast({
        title: 'Connection failed',
        description: 'Could not reach webhook endpoint. Check your internet connection.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleConnect = async () => {
    // Prevent concurrent connection attempts
    if (isConnecting) {
      addDebugLog('Connect Blocked', 'Connection already in progress', 'warning');
      toast({
        title: 'Connection in progress',
        description: 'Please wait for the current connection attempt to complete.',
        variant: 'default',
      });
      return;
    }

    // Cancel any previous connection attempt
    if (connectRequestRef.current) {
      connectRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    connectRequestRef.current = abortController;

    setIsConnecting(true);
    setDebugLogs([]);
    
    // Clear expired token flag when reconnecting
    localStorage.removeItem('gocardless_token_expired');
    localStorage.removeItem('gocardless_token_expired_time');
    
    try {
      // Validate user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // CRITICAL FIX: Clear ALL old sessionStorage entries from previous connection attempts
      // This prevents the callback page from thinking the URL was already processed
      try {
        const keysToRemove: string[] = [];
        // Check all sessionStorage keys
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('gocardless_callback_processed_')) {
            keysToRemove.push(key);
          }
        }
        // Remove all found keys
        keysToRemove.forEach(key => {
          sessionStorage.removeItem(key);
        });
        if (keysToRemove.length > 0) {
          console.log('[GC-CLIENT] ✅ Cleared', keysToRemove.length, 'old sessionStorage entries');
        } else {
          console.log('[GC-CLIENT] ✅ No old sessionStorage entries to clear');
        }
        
        // Also clear any localStorage items from previous failed attempts (but keep current ones)
        // This ensures a clean slate for the new connection
        const oldState = localStorage.getItem('gocardless_state');
        if (oldState) {
          console.log('[GC-CLIENT] Clearing old state from localStorage');
          localStorage.removeItem('gocardless_state');
        }
      } catch (e) {
        console.warn('[GC-CLIENT] ⚠️ Failed to clear sessionStorage:', e);
      }

      // Step 1: Generate unique session token for persistent handshake
      const sessionToken = generateSessionToken();
      console.log('[GC-CLIENT] === PERSISTENT HANDSHAKE INITIALIZATION ===');
      console.log('[GC-CLIENT] Generated session token:', sessionToken);
      console.log('[GC-CLIENT] User ID:', user.id);
      
      // Step 2: Use hardcoded, dedicated redirect URL (flat route)
      const currentHostname = window.location.hostname;
      const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
      // CRITICAL: Use dedicated callback route (not Settings page)
      const redirectUrl = isProduction 
        ? 'https://solowipe.co.uk/gocardless-callback'
        : `${window.location.origin}/gocardless-callback`;
      
      console.log('[GC-CLIENT] === REDIRECT URL CONSTRUCTION ===');
      console.log('[GC-CLIENT] Current hostname:', currentHostname);
      console.log('[GC-CLIENT] Current origin:', window.location.origin);
      console.log('[GC-CLIENT] Is production:', isProduction);
      console.log('[GC-CLIENT] Hardcoded redirect URL:', redirectUrl);
      console.log('[GC-CLIENT] Redirect URL length:', redirectUrl.length);
      console.log('[GC-CLIENT] Redirect URL has trailing slash:', redirectUrl.endsWith('/'));
      console.log('[GC-CLIENT] ⚠️ CRITICAL: This URL MUST exactly match what is registered in GoCardless Dashboard');
      console.log('[GC-CLIENT] ⚠️ Check GoCardless Dashboard → Settings → API → Redirect URIs');
      console.log('[GC-CLIENT] ⚠️ URL should be: /gocardless-callback (no query params)');
      console.log('[GC-CLIENT] === END REDIRECT URL CONSTRUCTION ===');
      
      // Step 3: Store session token and user ID in localStorage (persistent handshake)
      // CRITICAL: Set these BEFORE calling the edge function to ensure they're available
      localStorage.setItem('gocardless_session_token', sessionToken);
      localStorage.setItem('gocardless_user_id', user.id);
      localStorage.setItem('gocardless_redirect_url', redirectUrl);
      
      // Verify they were set
      const verifyToken = localStorage.getItem('gocardless_session_token');
      const verifyUserId = localStorage.getItem('gocardless_user_id');
      const verifyRedirectUrl = localStorage.getItem('gocardless_redirect_url');
      console.log('[GC-CLIENT] Verification - Token:', verifyToken ? '✅ Set' : '❌ MISSING');
      console.log('[GC-CLIENT] Verification - User ID:', verifyUserId ? '✅ Set' : '❌ MISSING');
      console.log('[GC-CLIENT] Verification - Redirect URL:', verifyRedirectUrl ? '✅ Set' : '❌ MISSING');
      
      console.log('[GC-CLIENT] === PERSISTENT HANDshake STORED ===');
      console.log('[GC-CLIENT] Session token stored in localStorage');
      console.log('[GC-CLIENT] User ID stored in localStorage');
      console.log('[GC-CLIENT] Redirect URL stored in localStorage');
      console.log('[GC-CLIENT] === END HANDshake STORAGE ===');
      
      addDebugLog('Connect Started', `Redirect URL: ${redirectUrl}`, 'info');
      addDebugLog('Session Token', `Generated: ${sessionToken.substring(0, 20)}...`, 'info');
      addDebugLog('Environment Check', `Hostname: ${currentHostname}, Production: ${isProduction}`, 'info');
      
      console.log('[GC-CLIENT] Invoking gocardless-connect function...');
      addDebugLog('Invoking Function', 'Calling gocardless-connect Edge Function', 'info');
      
      // Add timeout protection (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error('Connection request timed out. Please check your internet connection and try again.'));
        }, 30000);
      });

      let data, error;
      try {
        const result = await Promise.race([
          supabase.functions.invoke('gocardless-connect', {
            body: { redirectUrl },
          }),
          timeoutPromise,
        ]);
        data = result.data;
        error = result.error;
      } catch (timeoutError) {
        if (timeoutError instanceof Error && timeoutError.message.includes('timeout')) {
          throw timeoutError;
        }
        // Re-throw if it's not a timeout
        throw timeoutError;
      }

      console.log('[GC-CLIENT] Function response received');
      console.log('[GC-CLIENT] Has error:', !!error);
      console.log('[GC-CLIENT] Has data:', !!data);
      console.log('[GC-CLIENT] Data URL:', data?.url ? 'Present' : 'Missing');
      console.log('[GC-CLIENT] Data error:', data?.error || 'None');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4b701dd-7193-44af-8f36-968bf3584f49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GoCardlessSection.tsx:390',message:'Connect function response - redirect URL being sent to GoCardless',data:{redirectUrl:redirectUrl,oauthUrl:data?.url?data.url.substring(0,100)+'...':'null',hasError:!!error,errorMessage:error?String(error):'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      // Check for error in data (non-2xx responses from Supabase functions)
      if (data?.error && !error) {
        console.error('[GC-CLIENT] ❌ Error found in response data (non-2xx status):', data.error);
        addDebugLog('Connect Error', `Error in data: ${data.error}`, 'error');
        throw new Error(data.error || 'GoCardless connection failed');
      }
      
      if (error) {
        console.error('[GC-CLIENT] ❌ Function returned error:', error);
        console.error('[GC-CLIENT] Error type:', error.constructor?.name || typeof error);
        console.error('[GC-CLIENT] Error message:', (error as any)?.message || String(error));
        console.error('[GC-CLIENT] Error context:', (error as any)?.context);
        addDebugLog('Connect Error', JSON.stringify(error, null, 2), 'error');
        
        // Check if it's a redirect URI mismatch error
        const errorMessage = (error as any)?.message || String(error) || '';
        if (errorMessage.includes('redirect_uri') || errorMessage.includes('redirect URI') || errorMessage.includes('Bad request')) {
          toast({
            title: 'Redirect URI Mismatch',
            description: (
              <div className="space-y-2">
                <p className="text-sm">The redirect URI doesn't match GoCardless Dashboard.</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {redirectUrl}
                </p>
                <p className="text-xs">Register this exact URL in GoCardless Dashboard → Settings → API → Redirect URIs</p>
              </div>
            ),
            variant: 'destructive',
            duration: 10000,
          });
        }
        
        throw error;
      }
      
      if (!data) {
        console.error('[GC-CLIENT] ❌ Function returned no data');
        addDebugLog('No Data', 'Function returned empty response', 'error');
        throw new Error('No response data from GoCardless connect function');
      }
      
      if (!data.url) {
        console.error('[GC-CLIENT] ❌ Function response missing URL');
        console.error('[GC-CLIENT] Response data:', JSON.stringify(data, null, 2));
        addDebugLog('Missing URL', 'Function response does not contain OAuth URL', 'error');
        throw new Error('OAuth URL not returned from GoCardless connect function');
      }

      addDebugLog('OAuth URL Received', data?.url ? 'Success' : 'No URL returned', data?.url ? 'success' : 'error');

      if (data?.url) {
        console.log('[GC-CLIENT] === OAUTH URL RECEIVED FROM SERVER ===');
        console.log('[GC-CLIENT] Full OAuth URL:', data.url);
        
        // Extract redirect_uri from OAuth URL for verification
        try {
          const oauthUrlObj = new URL(data.url);
          const redirectUriFromOAuth = oauthUrlObj.searchParams.get('redirect_uri');
          const clientIdFromOAuth = oauthUrlObj.searchParams.get('client_id');
          const oauthBaseUrl = oauthUrlObj.origin;
          const isLive = oauthBaseUrl.includes('connect.gocardless.com') && !oauthBaseUrl.includes('sandbox');
          const isSandbox = oauthBaseUrl.includes('sandbox');
          
          console.log('[GC-CLIENT] === OAUTH URL ANALYSIS ===');
          console.log('[GC-CLIENT] OAuth Base URL:', oauthBaseUrl);
          console.log('[GC-CLIENT] Detected Environment:', isSandbox ? 'SANDBOX' : (isLive ? 'LIVE' : 'UNKNOWN'));
          console.log('[GC-CLIENT] Client ID in OAuth URL:', clientIdFromOAuth ? `${clientIdFromOAuth.substring(0, 8)}...` : 'MISSING');
          console.log('[GC-CLIENT] Redirect URI in OAuth URL:', redirectUriFromOAuth);
          console.log('[GC-CLIENT] Redirect URI we sent:', redirectUrl);
          console.log('[GC-CLIENT] Match:', redirectUriFromOAuth === redirectUrl ? '✅ YES' : '❌ NO - MISMATCH!');
          console.log('[GC-CLIENT] ⚠️ VERIFY: This redirect URI is registered in GoCardless Dashboard');
          console.log('[GC-CLIENT] ⚠️ VERIFY: Environment matches -', isSandbox ? 'SANDBOX Client ID → SANDBOX Dashboard' : 'LIVE Client ID → LIVE Dashboard');
          console.log('[GC-CLIENT] ⚠️ SANDBOX Dashboard: https://manage-sandbox.gocardless.com/settings/api');
          console.log('[GC-CLIENT] ⚠️ LIVE Dashboard: https://manage.gocardless.com/settings/api');
          console.log('[GC-CLIENT] === END OAUTH URL ANALYSIS ===');
        } catch (e) {
          console.warn('[GC-CLIENT] Could not parse OAuth URL:', e);
        }
        
        console.log('[GC-CLIENT] This URL will redirect user to GoCardless');
        console.log('[GC-CLIENT] After authorization, GoCardless will redirect to:', redirectUrl);
        console.log('[GC-CLIENT] GoCardless will append: ?code=XXX&state=YYY');
        console.log('[GC-CLIENT] ⚠️ CRITICAL: The redirect_uri MUST be registered in GoCardless Dashboard');
        console.log('[GC-CLIENT] ⚠️ Go to: https://manage.gocardless.com/settings/api (or sandbox equivalent)');
        console.log('[GC-CLIENT] ⚠️ Add this EXACT URL to Redirect URIs:', redirectUrl);
        console.log('[GC-CLIENT] === END OAUTH URL LOG ===');
        
        // Store OAuth state (in addition to session token)
        localStorage.setItem('gocardless_state', data.state);
        
        // Verify all localStorage items are set before redirecting
        const verifyStorage = () => {
          const storedSessionToken = localStorage.getItem('gocardless_session_token');
          const storedUserId = localStorage.getItem('gocardless_user_id');
          const storedRedirectUrl = localStorage.getItem('gocardless_redirect_url');
          const storedState = localStorage.getItem('gocardless_state');
          
          const allPresent = storedSessionToken && storedUserId && storedRedirectUrl && storedState;
          
          console.log('[GC-CLIENT] === LOCALSTORAGE VERIFICATION ===');
          console.log('[GC-CLIENT] Session token:', storedSessionToken ? '✅ Present' : '❌ MISSING');
          console.log('[GC-CLIENT] User ID:', storedUserId ? '✅ Present' : '❌ MISSING');
          console.log('[GC-CLIENT] Redirect URL:', storedRedirectUrl ? '✅ Present' : '❌ MISSING');
          console.log('[GC-CLIENT] State:', storedState ? '✅ Present' : '❌ MISSING');
          console.log('[GC-CLIENT] All items present:', allPresent ? '✅ YES' : '❌ NO');
          console.log('[GC-CLIENT] === END VERIFICATION ===');
          
          if (!allPresent) {
            console.error('[GC-CLIENT] ❌ CRITICAL: Not all localStorage items are present before redirect!');
            console.error('[GC-CLIENT] This will cause the callback to fail. Aborting redirect.');
            throw new Error('localStorage verification failed. Not all required items are present.');
          }
          
          return allPresent;
        };
        
        // Verify storage before redirecting
        if (!verifyStorage()) {
          throw new Error('Failed to store all required data in localStorage. Please try again.');
        }
        
        addDebugLog('State Stored', `State: ${data.state.substring(0, 20)}...`, 'info');
        addDebugLog('Redirecting', 'Opening GoCardless OAuth...', 'info');
        console.log('[GC-CLIENT] === OUTBOUND HANDSHAKE COMPLETE ===');
        console.log('[GC-CLIENT] Session token:', sessionToken);
        console.log('[GC-CLIENT] User ID:', user.id);
        console.log('[GC-CLIENT] Redirect URL:', redirectUrl);
        console.log('[GC-CLIENT] All data stored in localStorage - ready for redirect');
        console.log('[GC-CLIENT] ✅ VERIFIED: All localStorage items present');
        console.log('[GC-CLIENT] Redirecting user to GoCardless OAuth page...');
        console.log('[GC-CLIENT] === END OUTBOUND HANDSHAKE ===');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c4b701dd-7193-44af-8f36-968bf3584f49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GoCardlessSection.tsx:498',message:'BEFORE redirect to GoCardless - final state check',data:{redirectUrl:redirectUrl,oauthUrl:data.url.substring(0,150)+'...',sessionToken:sessionToken.substring(0,20)+'...',userId:user.id,allStoragePresent:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
        
        // Small delay to ensure localStorage is fully written (browser optimization)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Final verification before redirect
        if (!verifyStorage()) {
          throw new Error('localStorage data lost before redirect. Please try again.');
        }
        
        // Redirect to GoCardless OAuth
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      // Get redirect URL before cleanup
      const redirectUrl = localStorage.getItem('gocardless_redirect_url') || 
        (() => {
          const currentHostname = window.location.hostname;
          const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
          return isProduction 
            ? 'https://solowipe.co.uk/gocardless-callback'
            : `${window.location.origin}/gocardless-callback`;
        })();
      
      // Clean up localStorage on error
      localStorage.removeItem('gocardless_session_token');
      localStorage.removeItem('gocardless_user_id');
      localStorage.removeItem('gocardless_redirect_url');
      localStorage.removeItem('gocardless_state');
      
      console.error('[GC-CLIENT] ❌ Connection failed:', error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string; context?: { body?: { error?: string } }; name?: string };
        errorMessage = errorObj.message || errorObj.name || 'Unknown error';
        
        // Check for Supabase function error details
        if (errorObj.context?.body?.error) {
          errorDetails = errorObj.context.body.error;
        }
      }
      
      console.error('[GC-CLIENT] Error message:', errorMessage);
      console.error('[GC-CLIENT] Error details:', errorDetails);
      console.error('[GC-CLIENT] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      addDebugLog('Connection Failed', errorMessage, 'error');
      if (errorDetails) {
        addDebugLog('Error Details', errorDetails, 'error');
      }
      
      // Check if this is a redirect URI mismatch error (from GoCardless OAuth page)
      // This error typically comes back as a 400 from GoCardless, not from our function
      const isRedirectUriError = errorMessage.includes('redirect_uri') || 
                                 errorMessage.includes('redirect') ||
                                 errorMessage.includes('Bad request') ||
                                 errorDetails.includes('redirect_uri') ||
                                 errorDetails.includes('redirect') ||
                                 errorMessage.includes('does not match');
      
      if (isRedirectUriError) {
        // Show detailed error with redirect URI
        toast({
          title: 'Redirect URI Mismatch',
          description: (
            <div className="space-y-2">
              <p className="text-sm font-semibold">The redirect URI doesn't match GoCardless Dashboard.</p>
              <div className="bg-muted p-2 rounded text-xs">
                <p className="font-mono break-all mb-1">{redirectUrl}</p>
                <p className="text-muted-foreground mt-1">
                  Register this EXACT URL in GoCardless Dashboard → Settings → API → Redirect URIs
                </p>
              </div>
            </div>
          ),
          variant: 'destructive',
          duration: 15000,
        });
        
        // Log detailed instructions to console
        console.error('[GC-CLIENT] ❌ REDIRECT URI MISMATCH ERROR');
        // Detect if mobile device
        const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(new URL(redirectUrl).hostname);
        const isMobile = isIPAddress || /mobile|android|iphone|ipad/i.test(navigator.userAgent);
        
        console.error('[GC-CLIENT] ============================================');
        console.error('[GC-CLIENT] Redirect URI being sent:', redirectUrl);
        console.error('[GC-CLIENT] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');
        if (isMobile) {
          console.error('[GC-CLIENT] ⚠️ MOBILE DEVICE DETECTED');
          console.error('[GC-CLIENT] Mobile devices use IP addresses instead of localhost');
          console.error('[GC-CLIENT] You need to register the mobile redirect URI separately');
        }
        console.error('[GC-CLIENT] ============================================');
        console.error('[GC-CLIENT] ⚠️ ACTION REQUIRED:');
        console.error('[GC-CLIENT] 1. Go to: https://manage.gocardless.com/settings/api');
        console.error('[GC-CLIENT] 2. Find "Redirect URIs" section');
        console.error('[GC-CLIENT] 3. Add this EXACT URL (copy it exactly):');
        console.error('[GC-CLIENT]    ' + redirectUrl);
        if (isMobile) {
          console.error('[GC-CLIENT] 4. If testing on multiple devices, also register:');
          console.error('[GC-CLIENT]    http://localhost:8081/gocardless-callback (for laptop)');
        }
        console.error('[GC-CLIENT] ============================================');
        console.error('[GC-CLIENT] CRITICAL REQUIREMENTS:');
        console.error('[GC-CLIENT] - NO trailing slash (NOT /gocardless-callback/)');
        console.error('[GC-CLIENT] - Protocol must match (https for production, http for localhost/IP)');
        console.error('[GC-CLIENT] - Hostname/IP must match exactly');
        console.error('[GC-CLIENT] - Port must match exactly');
        console.error('[GC-CLIENT] - Environment must match (sandbox Client ID → sandbox URIs, live Client ID → live URIs)');
        console.error('[GC-CLIENT] ============================================');
        
        return; // Exit early, detailed error already logged
      }
      
      // Provide more specific error messages for other errors
      let userMessage = 'Failed to start GoCardless connection. Please try again.';
      let errorTitle = 'Connection failed';
      
      if (errorMessage.includes('CORS') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
        userMessage = 'Network error: Unable to reach GoCardless service. Check your internet connection and try again.';
        errorTitle = 'Network error';
      } else if (errorMessage.includes('not configured') || errorMessage.includes('missing') || errorMessage.includes('GOCARDLESS')) {
        userMessage = 'GoCardless is not properly configured. Please check your Supabase Edge Function secrets (GOCARDLESS_CLIENT_ID, GOCARDLESS_CLIENT_SECRET, GOCARDLESS_ENVIRONMENT).';
        errorTitle = 'Configuration error';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        userMessage = 'Authentication failed. Please sign out and sign back in, then try again.';
        errorTitle = 'Authentication error';
      } else if (errorMessage.includes('Function not found') || errorMessage.includes('404')) {
        userMessage = 'GoCardless function not found. The edge function may not be deployed. Please contact support.';
        errorTitle = 'Function not found';
      } else if (errorDetails) {
        userMessage = errorDetails;
      } else if (errorMessage && errorMessage !== 'Unknown error') {
        userMessage = errorMessage;
      }
      
      // Show error with helpful instructions
      toast({
        title: errorTitle,
        description: (
          <div className="space-y-2">
            <p className="text-sm">{userMessage}</p>
            <p className="text-xs text-muted-foreground">
              Check browser console (F12) for detailed error logs. Look for logs starting with [GC-CLIENT].
            </p>
          </div>
        ),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsConnecting(false);
      connectRequestRef.current = null;
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    addDebugLog('Disconnect Started', 'Invoking disconnect function...', 'info');
    
    try {
      const { data, error } = await supabase.functions.invoke('gocardless-disconnect');

      console.log('[GC-DISCONNECT] Function response:', { 
        hasData: !!data, 
        hasError: !!error,
        dataContent: data,
        errorContent: error,
      });

      // Check for error in response data (non-2xx responses)
      if (data?.error && !error) {
        console.error('[GC-DISCONNECT] Error in response data:', data.error);
        throw new Error(data.error);
      }

      if (error) {
        console.error('[GC-DISCONNECT] Function returned error:', error);
        addDebugLog('Disconnect Error', JSON.stringify(error), 'error');
        
        // Try to extract error message
        let errorMessage = 'Failed to disconnect GoCardless';
        const errorObj = error as any;
        
        if (errorObj?.context?.body?.error) {
          errorMessage = errorObj.context.body.error;
        } else if (errorObj?.context?.response?.data?.error) {
          errorMessage = errorObj.context.response.data.error;
        } else if (errorObj?.message) {
          errorMessage = errorObj.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      addDebugLog('Disconnect Success', 'GoCardless disconnected', 'success');
      toast({
        title: 'GoCardless disconnected',
        description: 'Your GoCardless account has been disconnected.',
      });
      onRefresh();
    } catch (error: unknown) {
      console.error('[GC-DISCONNECT] Failed to disconnect GoCardless:', error);
      
      let errorMessage = 'Failed to disconnect GoCardless. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string; error?: string };
        errorMessage = errorObj.message || errorObj.error || errorMessage;
      }
      
      addDebugLog('Disconnect Failed', errorMessage, 'error');
      toast({
        title: 'Disconnect failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  const handleTestConnection = async () => {
    addDebugLog('Test Connection', 'Checking current profile state...', 'info');
    
    // Log current profile state
    addDebugLog('Profile State', JSON.stringify({
      hasOrgId: !!profile?.gocardless_organisation_id,
      hasToken: !!profile?.gocardless_access_token_encrypted,
      tokenLength: profile?.gocardless_access_token_encrypted?.length || 0,
      connectedAt: profile?.gocardless_connected_at,
    }), 'info');

    // Force refresh
    onRefresh();
    addDebugLog('Refresh Triggered', 'Profile data will be reloaded', 'info');
    
    // Also run health check
    await checkWebhookHealth();
  };

  const getStatusColor = (status: DebugLog['status']) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'error': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthIcon = () => {
    if (isCheckingHealth) return <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />;
    switch (healthCheck.status) {
      case 'ok': return <Wifi className="w-5 h-5 text-success flex-shrink-0" />;
      case 'error': return <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />;
      default: return <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />;
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              ) : needsReconnect ? (
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              ) : (
                <Link2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">GoCardless Direct Debit</h3>
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'Connected - collect payments automatically'
                  : needsReconnect
                  ? 'Connection expired - please reconnect'
                  : hasPartialConnection
                  ? 'Connection incomplete - please reconnect'
                  : 'Connect to collect Direct Debit payments'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDebugMode}
              className={cn(
                "touch-sm min-h-[44px] w-10 h-10",
                showDebug ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Bug className="w-5 h-5 flex-shrink-0" />
            </Button>
            {isConnected ? (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                Connected
              </Badge>
            ) : needsReconnect ? (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/30">
                Expired
              </Badge>
            ) : hasPartialConnection ? (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">
                Reconnect Required
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Connection Verification Status */}
        {(isVerifyingConnection || connectionVerificationMessage) && (
          <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              {isVerifyingConnection && (
                <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              )}
              <span className={`text-sm font-semibold ${isVerifyingConnection ? 'text-primary' : 'text-muted-foreground'}`}>
                {connectionVerificationMessage || 'Verifying connection...'}
              </span>
            </div>
          </div>
        )}

        {/* Technical Details Toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {showTechnicalDetails ? (
              <>
                <ChevronUp className="w-3 h-3 flex-shrink-0" />
                Hide Technical Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
                Show Technical Details
              </>
            )}
          </button>
        </div>

        {/* Debug Panel - Hidden by default, shown when showTechnicalDetails is true */}
        {showTechnicalDetails && (
          <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">Debug Info</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleTestConnection} disabled={isCheckingHealth}>
                  <RefreshCw className={`w-3 h-3 mr-1 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  Test
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDebugLogs([])}>
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Org ID:</span>
                <span className={profile?.gocardless_organisation_id ? 'text-success' : 'text-destructive'}>
                  {profile?.gocardless_organisation_id || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token:</span>
                <span className={profile?.gocardless_access_token_encrypted ? 'text-success' : 'text-destructive'}>
                  {profile?.gocardless_access_token_encrypted 
                    ? `${profile.gocardless_access_token_encrypted.length} chars` 
                    : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected:</span>
                <span>{profile?.gocardless_connected_at || 'Never'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={
                  isConnected ? 'text-success' : 
                  needsReconnect ? 'text-destructive' :
                  hasPartialConnection ? 'text-warning' : 
                  'text-muted-foreground'
                }>
                  {isConnected ? 'CONNECTED' : 
                   needsReconnect ? 'EXPIRED' :
                   hasPartialConnection ? 'PARTIAL' : 
                   'NOT CONNECTED'}
                </span>
              </div>
              {needsReconnect && (
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Token Status:</span>
                  <span className="text-destructive text-xs">
                    Expired - Reconnect Required
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                <span className="text-muted-foreground">Webhook Health:</span>
                <div className="flex items-center gap-2">
                  {getHealthIcon()}
                  <span className={healthCheck.status === 'ok' ? 'text-success' : healthCheck.status === 'error' ? 'text-destructive' : 'text-warning'}>
                    {healthCheck.status.toUpperCase()}
                  </span>
                </div>
              </div>
              {healthCheck.lastChecked && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Checked:</span>
                  <span>{healthCheck.lastChecked.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {debugLogs.length > 0 && (
              <Collapsible className="mt-3">
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
                  View Logs ({debugLogs.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {debugLogs.map((log, i) => (
                      <div key={i} className={`text-xs font-mono ${getStatusColor(log.status)}`}>
                        [{log.timestamp}] {log.action}: {log.details}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {isConnected || needsReconnect ? (
          <div className="mt-4 pt-4 border-t space-y-3">
            {needsReconnect && (
              <div className="p-4 bg-destructive/10 dark:bg-destructive/20 rounded-xl border border-destructive/30 dark:border-destructive/40">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive dark:text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive dark:text-destructive">
                      Connection Expired
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your GoCardless connection has expired. Please reconnect to continue using Direct Debit.
                    </p>
                    {profile?.gocardless_connected_at && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Last connected: {new Date(profile.gocardless_connected_at).toLocaleString()}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs touch-sm min-h-[44px]"
                      onClick={() => {
                        localStorage.removeItem('gocardless_token_expired');
                        localStorage.removeItem('gocardless_token_expired_time');
                        onRefresh();
                        toast({
                          title: 'Expired flag cleared',
                          description: 'The expired flag has been cleared. If the issue persists, please reconnect GoCardless.',
                        });
                      }}
                    >
                      Clear Expired Flag
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground flex-1 min-w-0">
                <div className="break-words">Organisation ID: {profile?.gocardless_organisation_id?.substring(0, 12)}...</div>
                <p className="text-xs text-muted-foreground/70 mt-1 break-words">
                  Standard platform & processing fees apply to payout.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={needsReconnect ? handleConnect : () => setShowDisconnectConfirm(true)}
                disabled={isDisconnecting || isConnecting}
                className="touch-sm min-h-[44px] whitespace-nowrap flex-shrink-0"
              >
                {isDisconnecting || isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : needsReconnect ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect
                  </>
                ) : (
                  <>
                    <Link2Off className="w-4 h-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
            
            {/* Health Check Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={checkWebhookHealth}
              disabled={isCheckingHealth}
              className="w-full justify-start text-muted-foreground hover:text-foreground touch-sm min-h-[44px]"
            >
              {getHealthIcon()}
              <span className="ml-2">
                {isCheckingHealth ? 'Checking connection...' : 'Test Webhook Connection'}
              </span>
              {healthCheck.status === 'ok' && (
                <Badge variant="secondary" className="ml-auto bg-success/10 text-success text-xs">
                  Healthy
                </Badge>
              )}
            </Button>
          </div>
        ) : hasPartialConnection ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-warning">
              Your GoCardless connection is incomplete. Please disconnect and reconnect to fix this.
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectConfirm(true)}
              disabled={isDisconnecting}
              className="w-full touch-sm min-h-[44px]"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2Off className="w-4 h-4 mr-2" />
              )}
              Disconnect & Retry
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {isVerifyingConnection ? (
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">
                    {connectionVerificationMessage || 'Verifying connection...'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✓ Set up Direct Debit mandates for customers</p>
                  <p>✓ Automatically collect payments on job completion</p>
                  <p>✓ Track payment status in real-time</p>
                </div>
                
                {/* Show redirect URI info only in technical details */}
                {showTechnicalDetails && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-2">
                ⚠️ Before connecting, register this redirect URI in GoCardless:
              </p>
              <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-amber-300 dark:border-amber-700 mb-2">
                <p className="text-xs font-mono text-amber-900 dark:text-amber-100 break-all">
                  {(() => {
                    const currentHostname = window.location.hostname;
                    const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
                    return isProduction 
                      ? 'https://solowipe.co.uk/gocardless-callback'
                      : `${window.location.origin}/gocardless-callback`;
                  })()}
                </p>
              </div>
              {(() => {
                const currentHostname = window.location.hostname;
                const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
                const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);
                const isPrivateIP = isIPAddress && (
                  currentHostname.startsWith('192.168.') ||
                  currentHostname.startsWith('10.') ||
                  currentHostname.startsWith('172.16.') ||
                  currentHostname.startsWith('172.17.') ||
                  currentHostname.startsWith('172.18.') ||
                  currentHostname.startsWith('172.19.') ||
                  currentHostname.startsWith('172.20.') ||
                  currentHostname.startsWith('172.21.') ||
                  currentHostname.startsWith('172.22.') ||
                  currentHostname.startsWith('172.23.') ||
                  currentHostname.startsWith('172.24.') ||
                  currentHostname.startsWith('172.25.') ||
                  currentHostname.startsWith('172.26.') ||
                  currentHostname.startsWith('172.27.') ||
                  currentHostname.startsWith('172.28.') ||
                  currentHostname.startsWith('172.29.') ||
                  currentHostname.startsWith('172.30.') ||
                  currentHostname.startsWith('172.31.')
                );
                
                if (isIPAddress) {
                  return (
                    <div className={`mt-2 p-3 border rounded-xl ${isPrivateIP ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isPrivateIP ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}>
                        {isPrivateIP ? '🚫 Private IP Address Detected' : '📱 Mobile Device Detected'}
                      </p>
                      <p className={`text-xs ${isPrivateIP ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
                        {isPrivateIP ? (
                          <>
                            <strong>GoCardless doesn't accept private IP addresses (192.168.x.x) as redirect URIs.</strong>
                            <br /><br />
                            <strong>Solutions:</strong>
                            <br />
                            1. <strong>Use ngrok:</strong> Set up a tunnel service (e.g., <code className="text-xs">ngrok http 8081</code>) and use the ngrok URL
                            <br />
                            2. <strong>Access via laptop IP:</strong> On mobile, access the app using your laptop's IP (e.g., <code className="text-xs">http://[laptop-ip]:8081</code>) instead of the mobile device's IP
                            <br />
                            3. <strong>Use localhost:</strong> If possible, configure your mobile browser to use localhost (may require special setup)
                            <br />
                            4. <strong>Use production domain:</strong> For production, use <code className="text-xs">https://solowipe.co.uk/gocardless-callback</code> which works on all devices
                            <br /><br />
                            <strong>Recommended:</strong> Use ngrok for development testing on mobile devices.
                          </>
                        ) : (
                          <>
                            You're connecting from a mobile device. The redirect URI above uses your device's IP address.
                            <br /><br />
                            <strong>Important:</strong> You need to register this exact URL in GoCardless Dashboard. 
                            If you're testing on multiple devices (laptop + mobile), register BOTH redirect URIs:
                            <br />
                            • Laptop: <code className="text-xs">http://localhost:8081/gocardless-callback</code>
                            <br />
                            • Mobile: <code className="text-xs">{window.location.origin}/gocardless-callback</code>
                          </>
                        )}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                GoCardless Dashboard → Settings → API → Redirect URIs → Add this URL exactly as shown above
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                ⚠️ The URL must match EXACTLY (including protocol, domain/IP, port, and path)
              </p>
                </div>
                )}
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting || isVerifyingConnection}
              className="w-full touch-sm min-h-[44px]"
            >
              {isConnecting || isVerifyingConnection ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {isVerifyingConnection ? 'Verifying connection...' : 'Connect GoCardless'}
            </Button>
            {showDebug && (
              <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border text-xs space-y-2">
                <div>
                  <p className="font-medium mb-1">Redirect URI that will be sent:</p>
                  <p className="font-mono break-all text-foreground bg-background p-2 rounded border border-border">
                    {(() => {
                      const currentHostname = window.location.hostname;
                      const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
                      return isProduction 
                        ? 'https://solowipe.co.uk/gocardless-callback'
                        : `${window.location.origin}/gocardless-callback`;
                    })()}
                  </p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="font-medium mb-1 text-warning">⚠️ Action Required:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                    <li>Go to <a href="https://manage.gocardless.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">GoCardless Dashboard → API Settings</a></li>
                    <li>Find "Redirect URIs" section</li>
                    <li>Add the URL above EXACTLY (copy it)</li>
                    <li>Make sure: NO trailing slash, correct protocol, correct hostname</li>
                    <li>Environment must match (sandbox Client ID → sandbox URIs, live Client ID → live URIs)</li>
                  </ol>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </Card>

      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect GoCardless?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your GoCardless account. Existing Direct Debit mandates will remain active, but you won't be able to collect new payments until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
