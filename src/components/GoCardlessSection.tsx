import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Link2Off, CheckCircle2, ExternalLink, Bug, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';
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

export function GoCardlessSection({ profile, onRefresh }: GoCardlessSectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  // Check both organisation ID and access token - if token is missing, connection is incomplete
  const isConnected = !!profile?.gocardless_organisation_id && !!profile?.gocardless_access_token_encrypted;
  const hasPartialConnection = !!profile?.gocardless_organisation_id && !profile?.gocardless_access_token_encrypted;

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

  const toggleDebugMode = () => {
    const newValue = !showDebug;
    setShowDebug(newValue);
    localStorage.setItem('gocardless_debug', String(newValue));
    if (newValue) {
      addDebugLog('Debug Mode', 'Enabled', 'info');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setDebugLogs([]);
    
    try {
      const redirectUrl = `${window.location.origin}/settings?gocardless=callback`;
      addDebugLog('Connect Started', `Redirect URL: ${redirectUrl}`, 'info');
      
      const { data, error } = await supabase.functions.invoke('gocardless-connect', {
        body: { redirectUrl },
      });

      if (error) {
        addDebugLog('Connect Error', JSON.stringify(error), 'error');
        throw error;
      }

      addDebugLog('OAuth URL Received', data?.url ? 'Success' : 'No URL returned', data?.url ? 'success' : 'error');

      if (data?.url) {
        // Store state for callback verification
        localStorage.setItem('gocardless_state', data.state);
        localStorage.setItem('gocardless_redirect_url', redirectUrl);
        addDebugLog('State Stored', `State: ${data.state.substring(0, 20)}...`, 'info');
        addDebugLog('Redirecting', 'Opening GoCardless OAuth...', 'info');
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      console.error('Failed to connect GoCardless:', error);
      addDebugLog('Connection Failed', error instanceof Error ? error.message : 'Unknown error', 'error');
      toast({
        title: 'Connection failed',
        description: 'Failed to start GoCardless connection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    addDebugLog('Disconnect Started', 'Invoking disconnect function...', 'info');
    
    try {
      const { error } = await supabase.functions.invoke('gocardless-disconnect');

      if (error) {
        addDebugLog('Disconnect Error', JSON.stringify(error), 'error');
        throw error;
      }

      addDebugLog('Disconnect Success', 'GoCardless disconnected', 'success');
      toast({
        title: 'GoCardless disconnected',
        description: 'Your GoCardless account has been disconnected.',
      });
      onRefresh();
    } catch (error: unknown) {
      console.error('Failed to disconnect GoCardless:', error);
      addDebugLog('Disconnect Failed', error instanceof Error ? error.message : 'Unknown error', 'error');
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect GoCardless. Please try again.',
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
  };

  const getStatusColor = (status: DebugLog['status']) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'error': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Link2 className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-medium">GoCardless Direct Debit</h3>
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'Connected - collect payments automatically'
                  : hasPartialConnection
                  ? 'Connection incomplete - please reconnect'
                  : 'Connect to collect Direct Debit payments'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDebugMode}
              className={showDebug ? 'text-primary' : 'text-muted-foreground'}
            >
              <Bug className="w-4 h-4" />
            </Button>
            {isConnected ? (
              <Badge variant="secondary" className="bg-success/10 text-success">
                Connected
              </Badge>
            ) : hasPartialConnection ? (
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                Reconnect Required
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">Debug Info</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleTestConnection}>
                  <RefreshCw className="w-3 h-3 mr-1" />
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
                <span className={isConnected ? 'text-success' : hasPartialConnection ? 'text-warning' : 'text-muted-foreground'}>
                  {isConnected ? 'CONNECTED' : hasPartialConnection ? 'PARTIAL' : 'NOT CONNECTED'}
                </span>
              </div>
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

        {isConnected ? (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Organisation ID: {profile?.gocardless_organisation_id?.substring(0, 12)}...
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectConfirm(true)}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Link2Off className="w-4 h-4 mr-2" />
                  Disconnect
                </>
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
              className="w-full"
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
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Set up Direct Debit mandates for customers</p>
              <p>✓ Automatically collect payments on job completion</p>
              <p>✓ Track payment status in real-time</p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Connect GoCardless
            </Button>
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
