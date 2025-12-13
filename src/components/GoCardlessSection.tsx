import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Link2Off, CheckCircle2, ExternalLink } from 'lucide-react';
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

interface GoCardlessSectionProps {
  profile: Profile | null;
  onRefresh: () => void;
}

export function GoCardlessSection({ profile, onRefresh }: GoCardlessSectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = !!profile?.gocardless_organisation_id;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const redirectUrl = `${window.location.origin}/settings?gocardless=callback`;
      
      const { data, error } = await supabase.functions.invoke('gocardless-connect', {
        body: { redirectUrl },
      });

      if (error) throw error;

      if (data?.url) {
        // Store state for callback verification
        localStorage.setItem('gocardless_state', data.state);
        localStorage.setItem('gocardless_redirect_url', redirectUrl);
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      console.error('Failed to connect GoCardless:', error);
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
    try {
      const { error } = await supabase.functions.invoke('gocardless-disconnect');

      if (error) throw error;

      toast({
        title: 'GoCardless disconnected',
        description: 'Your GoCardless account has been disconnected.',
      });
      onRefresh();
    } catch (error: unknown) {
      console.error('Failed to disconnect GoCardless:', error);
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
                  : 'Connect to collect Direct Debit payments'}
              </p>
            </div>
          </div>
          
          {isConnected ? (
            <Badge variant="secondary" className="bg-success/10 text-success">
              Connected
            </Badge>
          ) : null}
        </div>

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
