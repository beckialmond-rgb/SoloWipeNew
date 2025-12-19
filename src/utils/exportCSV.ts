import { JobWithCustomer, Customer } from '@/types/database';
import { format } from 'date-fns';

export interface ExportJob extends JobWithCustomer {
  invoice_number: string | null;
}

// Calculate platform fee: (amount * 0.0075) + £0.20
function calculatePlatformFee(amountPounds: number): number {
  return (amountPounds * 0.0075) + 0.20;
}

// Calculate processing fee: (amount * 0.01) + £0.20, capped at £4.00
function calculateProcessingFee(amountPounds: number): number {
  const fee = (amountPounds * 0.01) + 0.20;
  return Math.min(fee, 4.00);
}

export function generateXeroCSV(jobs: ExportJob[], businessName: string): string {
  // Xero-compatible CSV headers with fee breakdown
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
    'PlatformFee',
    'ProcessingFee',
    'NetPayout',
    '*AccountCode',
    '*TaxType',
    'Currency',
  ];

  const rows = jobs.map(job => {
    const invoiceDate = job.completed_at ? format(new Date(job.completed_at), 'dd/MM/yyyy') : '';
    const dueDate = job.payment_date 
      ? format(new Date(job.payment_date), 'dd/MM/yyyy') 
      : invoiceDate;
    
    const amount = job.amount_collected || 0;
    
    // Application fees ONLY apply to GoCardless transactions
    // Cash and Bank Transfer payments have NO fees
    const isGoCardless = job.payment_method === 'gocardless';
    const platformFee = isGoCardless ? calculatePlatformFee(amount) : 0;
    const processingFee = isGoCardless ? calculateProcessingFee(amount) : 0;
    const netPayout = amount - platformFee - processingFee;
    
    return [
      job.customer.name,                                    // ContactName
      '',                                                   // EmailAddress
      job.customer.address,                                 // POAddressLine1
      job.invoice_number || `INV-${job.id.slice(0, 8).toUpperCase()}`, // InvoiceNumber
      invoiceDate,                                          // InvoiceDate
      dueDate,                                              // DueDate
      'Window Cleaning Service',                            // Description
      '1',                                                  // Quantity
      amount.toFixed(2),                                    // UnitAmount
      platformFee.toFixed(2),                               // PlatformFee (0 for cash/transfer)
      processingFee.toFixed(2),                             // ProcessingFee (0 for cash/transfer)
      netPayout.toFixed(2),                                 // NetPayout (equals amount for cash/transfer)
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

/**
 * Clean text for CSV export - removes commas and replaces with spaces
 */
function cleanTextForCSV(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).replace(/,/g, ' ').trim();
}

/**
 * Parse UK address to extract city and postal code
 * UK postcode format: AA9 9AA or AA99 9AA (with optional space)
 */
function parseUKAddress(address: string): { 
  addressLine1: string; 
  city: string; 
  postalCode: string;
} {
  const cleaned = cleanTextForCSV(address);
  
  // UK postcode regex: matches patterns like SW1A 1AA, SW1A1AA, M1 1AA, etc.
  const ukPostcodeRegex = /([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i;
  const postcodeMatch = cleaned.match(ukPostcodeRegex);
  
  let postalCode = '';
  let addressWithoutPostcode = cleaned;
  
  if (postcodeMatch) {
    postalCode = postcodeMatch[1].trim().toUpperCase();
    // Remove postcode from address
    addressWithoutPostcode = cleaned.replace(ukPostcodeRegex, '').trim();
  }
  
  // Split address by newlines or commas to find city
  const addressParts = addressWithoutPostcode.split(/[,\n]/).map(part => part.trim()).filter(part => part);
  
  let city = '';
  let addressLine1 = '';
  
  if (addressParts.length > 0) {
    // Last non-empty part before postcode is usually city
    // If we have multiple parts, take the last one as city
    if (addressParts.length > 1) {
      city = addressParts[addressParts.length - 1];
      addressLine1 = addressParts.slice(0, -1).join(' ');
    } else {
      // Single line address - use as addressLine1, city empty
      addressLine1 = addressParts[0];
    }
  } else {
    addressLine1 = addressWithoutPostcode;
  }
  
  // Clean up
  addressLine1 = cleanTextForCSV(addressLine1);
  city = cleanTextForCSV(city);
  
  return {
    addressLine1: addressLine1 || cleaned,
    city: city || '',
    postalCode: postalCode || '',
  };
}

/**
 * Export customers to Xero Contacts format
 * Compliant with UK HMRC standards and Xero import requirements
 */
export function exportCustomersToXero(customers: Customer[]): string {
  // Xero Contacts import headers (exact format required)
  const headers = [
    'ContactName',
    'EmailAddress',
    'POAddressLine1',
    'POCity',
    'POPostalCode',
    'TaxNumber',
  ];

  const rows = customers.map(customer => {
    // Parse UK address
    const { addressLine1, city, postalCode } = parseUKAddress(customer.address);
    
    // Clean contact name (remove commas)
    const contactName = cleanTextForCSV(customer.name);
    
    // Email - not stored in database, so empty
    const emailAddress = '';
    
    // VAT Number - not stored in database, so empty
    const taxNumber = '';
    
    return [
      contactName,      // ContactName
      emailAddress,     // EmailAddress
      addressLine1,     // POAddressLine1
      city,             // POCity
      postalCode,       // POPostalCode
      taxNumber,        // TaxNumber
    ];
  });

  // Build CSV content with proper escaping
  // Xero requires proper CSV escaping: quotes around fields containing commas/newlines
  const escapeCSVField = (field: string): string => {
    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download customers as Xero Contacts CSV
 */
export function downloadCustomersForXero(customers: Customer[], businessName: string): void {
  const csv = exportCustomersToXero(customers);
  const sanitizedBusinessName = businessName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = format(new Date(), 'dd-MM-yyyy');
  const filename = `${sanitizedBusinessName}_Customers_Xero_${dateStr}.csv`;
  downloadCSV(csv, filename);
}
