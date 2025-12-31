import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Download,
  Filter,
  Calendar,
  PoundSterling,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useHelperInvoices } from '@/hooks/useHelperInvoices';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useRole } from '@/hooks/useRole';
import { HelperEarningsInvoice } from '@/types/database';
import { formatCurrencyDecimal } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';
import { GenerateInvoiceModal } from '@/components/GenerateInvoiceModal';
import { InvoiceDetailModal } from '@/components/InvoiceDetailModal';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';

const HelperInvoices = () => {
  const navigate = useNavigate();
  const { isOwner } = useRole();
  const { helpers } = useSupabaseData();
  const {
    invoices,
    invoicesLoading,
    summary,
    summaryLoading,
    getDefaultPeriodDates,
  } = useHelperInvoices();

  // Redirect if not owner
  if (!isOwner) {
    navigate('/', { replace: true });
    return null;
  }

  // State
  const [selectedHelperId, setSelectedHelperId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<HelperEarningsInvoice | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<HelperEarningsInvoice | null>(null);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filter by helper
    if (selectedHelperId !== 'all') {
      filtered = filtered.filter(inv => inv.helper_id === selectedHelperId);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    return filtered;
  }, [invoices, selectedHelperId, statusFilter]);

  // Get helper name
  const getHelperName = (helperId: string): string => {
    const helper = helpers.find(h => h.id === helperId);
    return helper?.name || helper?.email || 'Unknown Helper';
  };

  // Get status badge
  const getStatusBadge = (status: HelperEarningsInvoice['status']) => {
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

  if (invoicesLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading invoices..." />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-4">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Helper Invoices</h1>
              <p className="text-muted-foreground">Manage invoices and payments for helpers</p>
            </div>
            <Button onClick={() => setShowGenerateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Invoices</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary.total_invoices}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <PoundSterling className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyDecimal(summary.total_amount)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Total Paid</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyDecimal(summary.total_paid)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">Outstanding</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrencyDecimal(summary.total_outstanding)}
                </p>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 mb-6"
        >
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedHelperId} onValueChange={setSelectedHelperId}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by helper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Helpers</SelectItem>
                {helpers.map(helper => (
                  <SelectItem key={helper.id} value={helper.id}>
                    {helper.name || helper.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description={
              invoices.length === 0
                ? "You haven't created any invoices yet. Create your first invoice to get started."
                : 'No invoices match your filters.'
            }
            icon={<FileText className="w-12 h-12 text-primary" />}
          />
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {invoice.invoice_number}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{getHelperName(invoice.helper_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(invoice.period_start), 'dd/MM/yyyy')} -{' '}
                          {format(new Date(invoice.period_end), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        <span className="capitalize">{invoice.period_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Total: </span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrencyDecimal(invoice.total_amount)}
                        </span>
                      </div>
                      {invoice.outstanding_balance > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Outstanding: </span>
                          <span className="text-lg font-bold text-amber-600">
                            {formatCurrencyDecimal(invoice.outstanding_balance)}
                          </span>
                        </div>
                      )}
                      {invoice.amount_paid > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Paid: </span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrencyDecimal(invoice.amount_paid)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {invoice.status === 'issued' && invoice.outstanding_balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={e => {
                          e.stopPropagation();
                          setPaymentInvoice(invoice);
                          setShowPaymentModal(true);
                        }}
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />

      {/* Modals */}
      <GenerateInvoiceModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        helpers={helpers}
      />

      {selectedInvoice && (
        <InvoiceDetailModal
          invoiceId={selectedInvoice.id}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRecordPayment={() => {
            setPaymentInvoice(selectedInvoice);
            setShowPaymentModal(true);
            setSelectedInvoice(null);
          }}
        />
      )}

      {paymentInvoice && (
        <RecordPaymentModal
          invoice={paymentInvoice}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default HelperInvoices;

