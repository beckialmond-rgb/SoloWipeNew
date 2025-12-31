import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useHelperInvoices } from '@/hooks/useHelperInvoices';
import { HelperEarningsInvoice } from '@/types/database';
import { formatCurrencyDecimal } from '@/utils/currencyUtils';
import { Loader2 } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: HelperEarningsInvoice;
  isOpen: boolean;
  onClose: () => void;
}

export function RecordPaymentModal({ invoice, isOpen, onClose }: RecordPaymentModalProps) {
  const { recordPayment, isRecordingPayment } = useHelperInvoices();

  const [paymentDate, setPaymentDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'cheque' | 'other'>(
    'bank_transfer'
  );
  const [amount, setAmount] = useState<string>(
    invoice.outstanding_balance > 0 ? invoice.outstanding_balance.toString() : ''
  );
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return;
    }

    if (paymentAmount > invoice.outstanding_balance) {
      // Could show warning, but allow partial payments
    }

    try {
      await recordPayment({
        invoiceId: invoice.id,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        amount: paymentAmount,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });
      onClose();
      // Reset form
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod('bank_transfer');
      setAmount('');
      setPaymentReference('');
      setNotes('');
    } catch (error) {
      // Error handled by hook
    }
  };

  const canSubmit = amount && parseFloat(amount) > 0 && paymentDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Info */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium text-foreground">
                {formatCurrencyDecimal(invoice.total_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium text-green-600">
                {formatCurrencyDecimal(invoice.amount_paid)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding:</span>
              <span className="font-medium text-amber-600">
                {formatCurrencyDecimal(invoice.outstanding_balance)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: 'bank_transfer' | 'cash' | 'cheque' | 'other') =>
                setPaymentMethod(value)
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (£)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.outstanding_balance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Max: ${formatCurrencyDecimal(invoice.outstanding_balance)}`}
            />
            {parseFloat(amount) > invoice.outstanding_balance && (
              <p className="text-sm text-amber-600">
                Amount exceeds outstanding balance. This will result in overpayment.
              </p>
            )}
          </div>

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
            <Input
              id="paymentReference"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              placeholder="Bank reference, cheque number, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRecordingPayment}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isRecordingPayment}>
            {isRecordingPayment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

