import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, MessageSquare, ExternalLink, CheckCircle2, Settings, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/database';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface DirectDebitSetupModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DebugLog {
  timestamp: string;
  action: string;
  details: string;
  status: 'info' | 'success' | 'error';
}

export function DirectDebitSetupModal({ customer, isOpen, onClose, onSuccess }: DirectDebitSetupModalProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authorisationUrl, setAuthorisationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [requiresReconnect, setRequiresReconnect] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [billingRequestId, setBillingRequestId] = useState<string | null>(null);

  const addDebugLog = (action: string, details: string, status: DebugLog['status'] = 'info') => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      details,
      status,
    };
    setDebugLogs(prev => [...prev, log]);
    console.log(`[DD-SETUP-DEBUG] ${action}:`, details);
  };

  const handleCreateMandate = async () => {
    setIsLoading(true);
    setDebugLogs([]);
    
    try {
    // Dynamically set redirect URLs based on environment
    // Use localhost:3000 for dev, production domain for prod
    const currentHostname = window.location.hostname;
    const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
    const REDIRECT_DOMAIN = isProduction ? 'https://solowipe.co.uk' : 'http://localhost:3000';
    const exitUrl = `${REDIRECT_DOMAIN}/customers`;
    const successUrl = `${REDIRECT_DOMAIN}/customers?mandate=success&customer=${customer.id}`;

      // Debug logging for redirect domain detection
      console.log('[DD Setup] Domain Detection:', {
        currentHostname,
        isProduction,
        redirectDomain: REDIRECT_DOMAIN,
        exitUrl,
        successUrl
      });

      addDebugLog('Create Mandate', `Customer: ${customer.name} (${customer.id})`, 'info');
      addDebugLog('Domain', `${isProduction ? 'PRODUCTION' : 'PREVIEW'}: ${REDIRECT_DOMAIN}`, 'info');
      addDebugLog('URLs', `Exit: ${exitUrl}, Success: ${successUrl}`, 'info');

      const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
        body: {
          customerId: customer.id,
          customerName: customer.name,
          exitUrl,
          successUrl,
        },
      });

      if (error) {
        addDebugLog('Function Error', JSON.stringify(error), 'error');
        throw error;
      }

      addDebugLog('Response', JSON.stringify(data), data?.authorisationUrl ? 'success' : 'error');

      if (data?.authorisationUrl) {
        setAuthorisationUrl(data.authorisationUrl);
        setBillingRequestId(data.billingRequestId);
        addDebugLog('Auth URL', data.authorisationUrl.substring(0, 60) + '...', 'success');
        addDebugLog('Billing Request ID', data.billingRequestId || 'N/A', 'info');
        toast({
          title: 'Direct Debit setup ready',
          description: 'Share the link with your customer to set up Direct Debit.',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to create mandate:', error);
      addDebugLog('Exception', error instanceof Error ? error.message : 'Unknown error', 'error');
      
      // Check if the error indicates reconnection is required
      const errorData = error as { message?: string; context?: { body?: { requiresReconnect?: boolean; error?: string } } };
      const bodyData = errorData?.context?.body;
      
      if (bodyData?.requiresReconnect) {
        setRequiresReconnect(true);
        addDebugLog('Reconnect Required', 'GoCardless connection expired', 'error');
        toast({
          title: 'GoCardless connection expired',
          description: 'Please reconnect your GoCardless account in Settings.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Setup failed',
          description: bodyData?.error || 'Failed to create Direct Debit setup. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!authorisationUrl) return;
    
    try {
      await navigator.clipboard.writeText(authorisationUrl);
      setCopied(true);
      addDebugLog('Link Copied', 'Copied to clipboard', 'success');
      toast({
        title: 'Link copied',
        description: 'Direct Debit setup link copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      addDebugLog('Copy Failed', error instanceof Error ? error.message : 'Unknown error', 'error');
      toast({
        title: 'Copy failed',
        description: 'Could not copy link. Please try manually selecting it.',
        variant: 'destructive',
      });
    }
  };

  const handleSendSms = () => {
    if (!authorisationUrl || !customer.mobile_phone) return;
    
    const message = encodeURIComponent(
      `Hi ${customer.name.split(' ')[0]}, please set up your Direct Debit for window cleaning payments using this secure link: ${authorisationUrl}`
    );
    addDebugLog('SMS Opened', `To: ${customer.mobile_phone}`, 'info');
    window.open(`sms:${customer.mobile_phone}?body=${message}`, '_blank');
  };

  const handleOpenLink = () => {
    if (!authorisationUrl) return;
    addDebugLog('Link Opened', 'Opening in new tab', 'info');
    window.open(authorisationUrl, '_blank');
  };

  const handleClose = () => {
    setAuthorisationUrl(null);
    setCopied(false);
    setDebugLogs([]);
    setBillingRequestId(null);
    onClose();
    if (authorisationUrl) {
      onSuccess();
    }
  };

  const handleGoToSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const getStatusColor = (status: DebugLog['status']) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Set Up Direct Debit</DrawerTitle>
              <DrawerDescription>
                {authorisationUrl 
                  ? `Share the link below with ${customer.name} to set up Direct Debit.`
                  : `Create a Direct Debit mandate for ${customer.name}.`
                }
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDebug(!showDebug)}
              className={showDebug ? 'text-primary' : 'text-muted-foreground'}
            >
              <Bug className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4">
          {/* Debug Panel */}
          {showDebug && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-muted-foreground">Debug Info</span>
                <Button variant="ghost" size="sm" onClick={() => setDebugLogs([])}>
                  Clear
                </Button>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID:</span>
                  <span>{customer.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has GC ID:</span>
                  <span className={customer.gocardless_id ? 'text-success' : 'text-muted-foreground'}>
                    {customer.gocardless_id ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mandate Status:</span>
                  <span>{customer.gocardless_mandate_status || 'None'}</span>
                </div>
                {billingRequestId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing Request:</span>
                    <span>{billingRequestId.substring(0, 12)}...</span>
                  </div>
                )}
              </div>

              {debugLogs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border max-h-32 overflow-y-auto space-y-1">
                  {debugLogs.map((log, i) => (
                    <div key={i} className={getStatusColor(log.status)}>
                      [{log.timestamp}] {log.action}: {log.details}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {requiresReconnect ? (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
                <Settings className="w-5 h-5 text-destructive shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Connection expired</p>
                  <p className="text-muted-foreground">Please reconnect GoCardless in Settings.</p>
                </div>
              </div>

              <Button
                onClick={handleGoToSettings}
                className="w-full min-h-[60px]"
              >
                <Settings className="w-5 h-5 mr-2" />
                Go to Settings
              </Button>
            </div>
          ) : !authorisationUrl ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.address}</p>
                <p className="text-sm">
                  Regular payment: <span className="font-medium">£{customer.price.toFixed(2)}</span>
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Your customer will enter their bank details securely</p>
                <p>• Payments are collected automatically when jobs complete</p>
                <p>• Funds typically arrive in 3-5 working days</p>
              </div>

              <Button
                onClick={handleCreateMandate}
                disabled={isLoading}
                className="w-full min-h-[60px]"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Generate Setup Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-success">Setup link ready!</p>
                  <p className="text-muted-foreground">Share it with your customer.</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm break-all font-mono">
                {authorisationUrl.substring(0, 50)}...
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="min-h-[60px]"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 mr-2 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>

                {customer.mobile_phone && (
                  <Button
                    onClick={handleSendSms}
                    variant="outline"
                    className="min-h-[60px]"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Send via SMS
                  </Button>
                )}

                <Button
                  onClick={handleOpenLink}
                  className="min-h-[60px]"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Open Link
                </Button>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline" className="min-h-[50px]">
              {authorisationUrl ? 'Done' : 'Cancel'}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
