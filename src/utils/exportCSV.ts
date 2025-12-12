import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';

export interface ExportJob extends JobWithCustomer {
  invoice_number: string | null;
}

export function generateXeroCSV(jobs: ExportJob[], businessName: string): string {
  // Xero-compatible CSV headers
  const headers = [
    '*ContactName',
    'EmailAddress',
    'POAddressLine1',
    '*InvoiceNumber',
    '*InvoiceDate',
    '*DueDate',
    '*Description',
    '*Quantity',
    '*UnitAmount',
    '*AccountCode',
    '*TaxType',
    'Currency',
  ];

  const rows = jobs.map(job => {
    const invoiceDate = job.completed_at ? format(new Date(job.completed_at), 'dd/MM/yyyy') : '';
    const dueDate = job.payment_date 
      ? format(new Date(job.payment_date), 'dd/MM/yyyy') 
      : invoiceDate;
    
    return [
      job.customer.name,                                    // ContactName
      '',                                                   // EmailAddress
      job.customer.address,                                 // POAddressLine1
      job.invoice_number || `INV-${job.id.slice(0, 8).toUpperCase()}`, // InvoiceNumber
      invoiceDate,                                          // InvoiceDate
      dueDate,                                              // DueDate
      'Window Cleaning Service',                            // Description
      '1',                                                  // Quantity
      (job.amount_collected || 0).toFixed(2),               // UnitAmount
      '200',                                                // AccountCode (Sales)
      'No VAT',                                             // TaxType
      'GBP',                                                // Currency
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEarningsToXero(jobs: ExportJob[], businessName: string, dateRange: string): void {
  const csv = generateXeroCSV(jobs, businessName);
  const filename = `${businessName.replace(/\s+/g, '_')}_Earnings_${dateRange}.csv`;
  downloadCSV(csv, filename);
}
