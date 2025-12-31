/**
 * Bulk DD Send Modal Component
 * 
 * Handles the bulk Direct Debit link sending workflow with:
 * - Option to use default template for all customers
 * - Progress tracking during bulk send
 * - Per-customer success/failure status
 * - Final summary with failed customers list
 */

import { CheckCircle2, XCircle, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export interface BulkDDSendResult {
  customerId: string;
  customerName: string;
  success: boolean;
  error?: string;
}

interface BulkDDSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  useDefaultTemplate: boolean;
  onToggleDefaultTemplate: (value: boolean) => void;
  onStart: () => void;
  isSending: boolean;
  progress: { current: number; total: number };
  results: BulkDDSendResult[];
  isComplete: boolean;
  onCancel?: () => void;
}

export function BulkDDSendModal({
  isOpen,
  onClose,
  customers,
  useDefaultTemplate,
  onToggleDefaultTemplate,
  onStart,
  isSending,
  progress,
  results,
  isComplete,
  onCancel,
}: BulkDDSendModalProps) {
  const handleClose = () => {
    if (isSending && !isComplete) {
      // Don't allow closing while sending unless complete
      return;
    }
    onClose();
  };

  const failedResults = results.filter(r => !r.success);
  const successCount = results.filter(r => r.success).length;
  const totalProcessed = results.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isComplete ? 'Bulk Send Complete' : isSending ? 'Sending DD Links...' : 'Send DD Links to Selected Customers'}
          </DialogTitle>
          <DialogDescription>
            {isComplete 
              ? `Processed ${totalProcessed} customer${totalProcessed !== 1 ? 's' : ''}`
              : isSending
              ? `Sending ${progress.current} of ${progress.total}...`
              : `Ready to send to ${customers.length} customer${customers.length !== 1 ? 's' : ''}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Pre-send state */}
          {!isSending && !isComplete && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {customers.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  customer{customers.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-card">
                <Checkbox
                  id="use-default-template"
                  checked={useDefaultTemplate}
                  onCheckedChange={(checked) => onToggleDefaultTemplate(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="use-default-template"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Use default template for all customers
                  <p className="text-xs text-muted-foreground mt-1 font-normal">
                    Skip template picker and use the default Direct Debit invite template
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Sending state */}
          {isSending && !isComplete && (
            <div className="space-y-3">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-lg font-semibold text-foreground">
                  Sending {progress.current} of {progress.total}...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress.current === progress.total ? 'Finalizing...' : 'Processing customers...'}
                </p>
              </div>

              {/* Per-customer status list */}
              {results.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={result.customerId}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        result.success
                          ? "bg-success/10 border-success/20"
                          : "bg-destructive/10 border-destructive/20"
                      )}
                    >
                      {result.success ? (
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.customerName}
                        </p>
                        {result.error && (
                          <p className="text-xs text-destructive mt-0.5">
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Complete state */}
          {isComplete && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {totalProcessed}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  customer{totalProcessed !== 1 ? 's' : ''} processed
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-success/10 rounded-lg p-3 text-center border border-success/20">
                  <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
                  <p className="text-lg font-bold text-success">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Sent successfully</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center border border-destructive/20">
                  <XCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                  <p className="text-lg font-bold text-destructive">{failedResults.length}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {/* Failed customers list */}
              {failedResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Failed:</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {failedResults.map((result) => (
                      <div
                        key={result.customerId}
                        className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                      >
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {result.customerName}
                          </p>
                          {result.error && (
                            <p className="text-xs text-destructive mt-0.5">
                              {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 flex-shrink-0">
          {isComplete ? (
            <Button
              className="flex-1 h-12"
              onClick={handleClose}
            >
              Done
            </Button>
          ) : isSending ? (
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onCancel}
              disabled={!onCancel}
            >
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 bg-primary hover:bg-primary/90"
                onClick={onStart}
              >
                <Send className="w-4 h-4 mr-2" />
                Start Sending
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

