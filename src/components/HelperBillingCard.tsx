import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, XCircle, Loader2, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { useHelperBilling } from '@/hooks/useHelperBilling';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
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
import { format } from 'date-fns';

export function HelperBillingCard() {
  const { helpers, activeHelpers, inactiveHelpers, deactivateHelper, isLoading, error, refetch } = useHelperBilling();
  const { status } = useSubscription();
  const [deactivatingHelperId, setDeactivatingHelperId] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [helperToDeactivate, setHelperToDeactivate] = useState<{ id: string; name: string } | null>(null);

  const subscriptionActive = status === 'active' || status === 'trialing';
  const subscriptionInactive = status === 'inactive' || status === 'past_due';

  const handleDeactivateClick = (helper: { id: string; helper_name: string | null; helper_email: string }) => {
    console.log('[HelperBillingCard] Deactivate button clicked', { 
      helper, 
      subscriptionInactive, 
      subscriptionActive,
      status,
      deactivatingHelperId 
    });
    setHelperToDeactivate({
      id: helper.id,
      name: helper.helper_name || helper.helper_email,
    });
    setShowDeactivateConfirm(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!helperToDeactivate) return;

    setDeactivatingHelperId(helperToDeactivate.id);
    try {
      await deactivateHelper(helperToDeactivate.id);
      setShowDeactivateConfirm(false);
      setHelperToDeactivate(null);
    } catch (error) {
      // Error is handled by the hook's toast
      console.error('[HelperBillingCard] Deactivation error:', error);
    } finally {
      setDeactivatingHelperId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-destructive/50 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold">Error loading helpers</h3>
        </div>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full">
          <Loader2 className="w-5 h-5 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (helpers.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center space-y-4">
        <Users className="w-12 h-12 text-muted-foreground mx-auto flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground mb-1">No helpers yet</h3>
          <p className="text-sm text-muted-foreground">
            Add helpers from the Helper Schedule page to get started.
          </p>
        </div>
      </div>
    );
  }

  // Subscription warning banner
  const showSubscriptionWarning = subscriptionInactive && helpers.length > 0;

  return (
    <div className="space-y-4">
      {/* Subscription Warning Banner */}
      {showSubscriptionWarning && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">Subscription Inactive</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your subscription is inactive. Helper billing cannot be updated.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-foreground">Helper Billing</h3>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {activeHelpers.length} active {activeHelpers.length !== 1 ? 'helpers' : 'helper'}
            </p>
            <p className="text-xs text-muted-foreground">
              {inactiveHelpers.length} inactive
            </p>
          </div>
        </div>

        {/* Monthly Cost Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base subscription:</span>
            <span className="font-medium text-foreground">£25/month</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Helpers:</span>
            <span className="font-medium text-foreground">
              {activeHelpers.length} × £5/month
            </span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Total:</span>
            <span className="font-bold text-foreground">
              £{25 + activeHelpers.length * 5}/month
            </span>
          </div>
        </div>
      </div>

      {/* Active Helpers */}
      {activeHelpers.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Active Helpers
          </h4>
          {activeHelpers.map((helper) => (
            <motion.div
              key={helper.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold text-foreground truncate">
                      {helper.helper_name || helper.helper_email}
                    </h5>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{helper.helper_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {helper.billing_started_at && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Started: {formatDate(helper.billing_started_at)}</span>
                  </div>
                )}
                {helper.stripe_subscription_item_id ? (
                  <div className="flex items-center gap-1.5 text-success">
                    <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Billing Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Billing Inactive</span>
                  </div>
                )}
              </div>

              {helper.stripe_subscription_item_id ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[HelperBillingCard] Button onClick fired', { 
                      helperId: helper.id, 
                      helperName: helper.helper_name || helper.helper_email,
                      disabled: deactivatingHelperId === helper.id || subscriptionInactive,
                      deactivatingHelperId,
                      subscriptionInactive,
                      status
                    });
                    handleDeactivateClick(helper);
                  }}
                  disabled={deactivatingHelperId === helper.id || subscriptionInactive}
                  className="w-full touch-sm min-h-[44px]"
                  type="button"
                >
                  {deactivatingHelperId === helper.id ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Deactivate
                    </>
                  )}
                </Button>
              ) : (
                <div className="w-full p-3 text-center text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border">
                  <p className="font-medium">Billing not active</p>
                  <p className="text-xs mt-1">This helper is active but billing hasn't started yet.</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Inactive Helpers */}
      {inactiveHelpers.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Inactive Helpers
          </h4>
          {inactiveHelpers.map((helper) => (
            <motion.div
              key={helper.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4 opacity-75"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold text-foreground truncate">
                      {helper.helper_name || helper.helper_email}
                    </h5>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
                      Inactive
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{helper.helper_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {helper.billing_started_at && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Started: {formatDate(helper.billing_started_at)}</span>
                  </div>
                )}
                {helper.billing_stopped_at && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Stopped: {formatDate(helper.billing_stopped_at)}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground italic">
                Reactivation coming soon
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              Deactivate Helper Billing?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <p className="mb-3">
                This will stop billing for <strong>{helperToDeactivate?.name}</strong>. They will no longer be charged £5/month.
              </p>
              <p className="mb-3 font-semibold text-foreground">What will happen:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm mb-3">
                <li>Billing will stop immediately</li>
                <li>Helper will be marked as inactive</li>
                <li><strong>All pending job assignments will be removed</strong> (they won't see assigned jobs anymore)</li>
                <li>They will lose access to premium features</li>
                <li>You can reactivate them later</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                This action can be reversed by reactivating the helper. When reactivated, you'll need to reassign jobs to them.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivatingHelperId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              disabled={deactivatingHelperId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivatingHelperId ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

