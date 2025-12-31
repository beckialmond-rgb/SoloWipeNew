import { HelperEarningsInvoiceWithItems, HelperEarningsPayment } from '@/types/database';
import { format } from 'date-fns';

/**
 * Export invoice to CSV format
 * Accountant-ready format with all required fields
 */
export function exportInvoiceToCSV(invoice: HelperEarningsInvoiceWithItems): void {
  const rows: string[] = [];

  // Header
  rows.push('Helper Invoice Export');
  rows.push(`Invoice Number,${invoice.invoice_number}`);
  rows.push(`Invoice Date,${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`);
  rows.push(`Period Type,${invoice.period_type}`);
  rows.push(`Period Start,${format(new Date(invoice.period_start), 'dd/MM/yyyy')}`);
  rows.push(`Period End,${format(new Date(invoice.period_end), 'dd/MM/yyyy')}`);
  rows.push(`Status,${invoice.status}`);
  rows.push(`Total Amount,£${invoice.total_amount.toFixed(2)}`);
  rows.push(`Amount Paid,£${invoice.amount_paid.toFixed(2)}`);
  rows.push(`Outstanding Balance,£${invoice.outstanding_balance.toFixed(2)}`);
  rows.push('');

  // Line Items Header
  rows.push('Line Items');
  rows.push('Date,Customer Name,Job Amount,Helper Payment Amount');

  // Line Items
  invoice.items.forEach(item => {
    rows.push(
      [
        format(new Date(item.job_date), 'dd/MM/yyyy'),
        `"${item.customer_name.replace(/"/g, '""')}"`,
        `£${item.job_amount.toFixed(2)}`,
        `£${item.helper_payment_amount.toFixed(2)}`,
      ].join(',')
    );
  });

  rows.push('');

  // Payments Header
  if (invoice.payments.length > 0) {
    rows.push('Payments');
    rows.push('Payment Date,Payment Method,Amount,Reference,Notes');

    invoice.payments.forEach(payment => {
      rows.push(
        [
          format(new Date(payment.payment_date), 'dd/MM/yyyy'),
          payment.payment_method.replace('_', ' '),
          `£${payment.amount.toFixed(2)}`,
          payment.payment_reference || '',
          payment.notes ? `"${payment.notes.replace(/"/g, '""')}"` : '',
        ].join(',')
      );
    });
  }

  // Create CSV content
  const csvContent = rows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `invoice-${invoice.invoice_number}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export multiple invoices to CSV
 * Summary format for accountant review
 */
export function exportInvoicesSummaryToCSV(invoices: HelperEarningsInvoiceWithItems[]): void {
  const rows: string[] = [];

  // Header
  rows.push('Helper Invoices Summary Export');
  rows.push(`Export Date,${format(new Date(), 'dd/MM/yyyy')}`);
  rows.push(`Total Invoices,${invoices.length}`);
  rows.push('');

  // Summary Header
  rows.push('Invoice Number,Invoice Date,Period Start,Period End,Status,Total Amount,Amount Paid,Outstanding Balance');

  // Invoice rows
  invoices.forEach(invoice => {
    rows.push(
      [
        invoice.invoice_number,
        format(new Date(invoice.invoice_date), 'dd/MM/yyyy'),
        format(new Date(invoice.period_start), 'dd/MM/yyyy'),
        format(new Date(invoice.period_end), 'dd/MM/yyyy'),
        invoice.status,
        `£${invoice.total_amount.toFixed(2)}`,
        `£${invoice.amount_paid.toFixed(2)}`,
        `£${invoice.outstanding_balance.toFixed(2)}`,
      ].join(',')
    );
  });

  // Totals
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstanding_balance, 0);

  rows.push('');
  rows.push(`Total,${format(new Date(), 'dd/MM/yyyy')},,,,£${totalAmount.toFixed(2)},£${totalPaid.toFixed(2)},£${totalOutstanding.toFixed(2)}`);

  // Create CSV content
  const csvContent = rows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `helper-invoices-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export payments to CSV
 * Payment history export for accountant review
 */
export function exportPaymentsToCSV(payments: HelperEarningsPayment[], invoiceNumber?: string): void {
  const rows: string[] = [];

  // Header
  rows.push('Helper Payments Export');
  if (invoiceNumber) {
    rows.push(`Invoice Number,${invoiceNumber}`);
  }
  rows.push(`Export Date,${format(new Date(), 'dd/MM/yyyy')}`);
  rows.push(`Total Payments,${payments.length}`);
  rows.push('');

  // Payments Header
  rows.push('Payment Date,Payment Method,Amount,Reference,Notes,Recorded Date');

  // Payment rows
  payments.forEach(payment => {
    rows.push(
      [
        format(new Date(payment.payment_date), 'dd/MM/yyyy'),
        payment.payment_method.replace('_', ' '),
        `£${payment.amount.toFixed(2)}`,
        payment.payment_reference || '',
        payment.notes ? `"${payment.notes.replace(/"/g, '""')}"` : '',
        format(new Date(payment.created_at), 'dd/MM/yyyy'),
      ].join(',')
    );
  });

  // Total
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  rows.push('');
  rows.push(`Total,,,,£${totalAmount.toFixed(2)},`);

  // Create CSV content
  const csvContent = rows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `helper-payments-${invoiceNumber || 'all'}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

