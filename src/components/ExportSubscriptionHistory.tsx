import { Download, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportSubscriptionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportSubscriptionHistory({ isOpen, onClose }: ExportSubscriptionHistoryProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Export Subscription History</DialogTitle>
          <DialogDescription>
            Download your subscription payment history and billing records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="bg-muted/50 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                This feature is currently under development. You'll be able to export your subscription payment history soon.
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">What will be included:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Subscription start and end dates</li>
              <li>Payment history and amounts</li>
              <li>Billing periods and invoices</li>
              <li>Payment method information</li>
            </ul>
          </div>
        </div>

        {/* Buttons - Sticky at bottom */}
        <div className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="flex-1 h-12"
              disabled
            >
              <Download className="w-4 h-4 mr-2" />
              Coming Soon
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

