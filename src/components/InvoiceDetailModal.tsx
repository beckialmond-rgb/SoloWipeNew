import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useHelperInvoices } from '@/hooks/useHelperInvoices';
import { HelperEarningsInvoiceWithItems } from '@/types/database';
import { formatCurrencyDecimal } from '@/utils/currencyUtils';
import { LoadingState } from '@/components/LoadingState';
import {
  FileText,
  Calendar,
  PoundSterling,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Receipt,
} from 'lucide-react';
import { exportInvoiceToCSV } from '@/utils/invoiceCSV';

interface InvoiceDetailModalProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: () => void;
}

export function InvoiceDetailModal({
  invoiceId,
  isOpen,
  onClose,
  onRecordPayment,
}: InvoiceDetailModalProps) {
  const { getInvoiceDetails, issueInvoice, isIssuingInvoice } = useHelperInvoices();
  const [invoice, setInvoice] = useState<HelperEarningsInvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setLoading(true);
      getInvoiceDetails(invoiceId)
        .then(setInvoice)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, invoiceId, getInvoiceDetails]);

  const handleIssue = async () => {
    if (!invoice) return;
    try {
      await issueInvoice(invoiceId);
      // Refresh invoice details
      const updated = await getInvoiceDetails(invoiceId);
      setInvoice(updated);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExport = () => {
    if (!invoice) return;
    exportInvoiceToCSV(invoice);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case 'issued':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <FileText className="w-3 h-3 mr-1" />
            Issued
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Invoice Details
            {invoice && getStatusBadge(invoice.status)}
          </DialogTitle>
          <DialogDescription>
            View invoice details, line items, and payment history
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message="Loading invoice details..." />
        ) : !invoice ? (
          <div className="py-8 text-center text-muted-foreground">
            Invoice not found
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Invoice Number</p>
                <p className="font-semibold text-foreground">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Invoice Date</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Period</p>
                <p className="font-semibold text-foreground capitalize">{invoice.period_type}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(invoice.period_start), 'dd/MM/yyyy')} -{' '}
                  {format(new Date(invoice.period_end), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <div>{getStatusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Line Items ({invoice.items.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-foreground">Date</th>
                      <th className="text-left p-3 text-sm font-medium text-foreground">Customer</th>
                      <th className="text-right p-3 text-sm font-medium text-foreground">Job Amount</th>
                      <th className="text-right p-3 text-sm font-medium text-foreground">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 text-sm text-foreground">
                          {format(new Date(item.job_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-3 text-sm text-foreground">{item.customer_name}</td>
                        <td className="p-3 text-sm text-muted-foreground text-right">
                          {formatCurrencyDecimal(item.job_amount)}
                        </td>
                        <td className="p-3 text-sm font-semibold text-foreground text-right">
                          {formatCurrencyDecimal(item.helper_payment_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrencyDecimal(invoice.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="text-foreground">Total:</span>
                    <span className="text-foreground">
                      {formatCurrencyDecimal(invoice.total_amount)}
                    </span>
                  </div>
                  {invoice.amount_paid > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid:</span>
                      <span>{formatCurrencyDecimal(invoice.amount_paid)}</span>
                    </div>
                  )}
                  {invoice.outstanding_balance > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Outstanding:</span>
                      <span>{formatCurrencyDecimal(invoice.outstanding_balance)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payments */}
            {invoice.payments.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Payments ({invoice.payments.length})
                </h3>
                <div className="space-y-2">
                  {invoice.payments.map(payment => (
                    <div
                      key={payment.id}
                      className="bg-muted rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {formatCurrencyDecimal(payment.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy')} •{' '}
                          {payment.payment_method.replace('_', ' ')}
                          {payment.payment_reference && ` • ${payment.payment_reference}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex gap-2">
            {invoice?.status === 'draft' && (
              <Button onClick={handleIssue} disabled={isIssuingInvoice}>
                Issue Invoice
              </Button>
            )}
            {invoice?.status === 'issued' && invoice.outstanding_balance > 0 && onRecordPayment && (
              <Button onClick={onRecordPayment}>Record Payment</Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

