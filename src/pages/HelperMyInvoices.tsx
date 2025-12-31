import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  PoundSterling,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { useHelperInvoices } from '@/hooks/useHelperInvoices';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { HelperEarningsInvoice } from '@/types/database';
import { formatCurrencyDecimal } from '@/utils/currencyUtils';
import { InvoiceDetailModal } from '@/components/InvoiceDetailModal';
import { exportInvoiceToCSV } from '@/utils/invoiceCSV';

const HelperMyInvoices = () => {
  const navigate = useNavigate();
  const { isHelper } = useRole();
  const { user } = useAuth();
  const {
    invoices,
    invoicesLoading,
    getInvoiceDetails,
  } = useHelperInvoices(user?.id);

  // Redirect if not helper
  if (!isHelper) {
    navigate('/', { replace: true });
    return null;
  }

  // State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<HelperEarningsInvoice | null>(null);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter(inv => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Calculate summary
  const summary = useMemo(() => {
    return {
      total: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
      paid: invoices.reduce((sum, inv) => sum + inv.amount_paid, 0),
      outstanding: invoices.reduce((sum, inv) => sum + inv.outstanding_balance, 0),
    };
  }, [invoices]);

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

  const handleExportInvoice = async (invoice: HelperEarningsInvoice) => {
    const details = await getInvoiceDetails(invoice.id);
    if (details) {
      exportInvoiceToCSV(details);
    }
  };

  if (invoicesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading your invoices..." />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">My Invoices</h1>
          <p className="text-muted-foreground">View your invoices and payment history</p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <PoundSterling className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrencyDecimal(summary.total)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrencyDecimal(summary.paid)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrencyDecimal(summary.outstanding)}
            </p>
          </motion.div>
        </div>

        {/* Status Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </motion.div>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description={
              invoices.length === 0
                ? "You don't have any invoices yet. Invoices will appear here once your owner creates them."
                : 'No invoices match your filter.'
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
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleExportInvoice(invoice);
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Export CSV"
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoiceId={selectedInvoice.id}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRecordPayment={() => {
            // Helpers cannot record payments
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default HelperMyInvoices;

