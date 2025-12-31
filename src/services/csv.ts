import { format } from 'date-fns';
import { JobWithCustomer, ExpenseWithJob } from '@/types/database';

/**
 * CSV Service - Core Utilities
 * 
 * Centralized CSV generation utilities for consistent formatting across the app.
 * This module provides core utilities for CSV field escaping, date formatting,
 * money formatting, and row validation.
 * 
 * All functions follow RFC 4180 CSV standard and handle null/undefined safely.
 */

// Constants
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy' as const;
const MAX_FIELD_LENGTH = 1000;

// Types
export type CSVFieldValue = string | number | null | undefined;
export type DateFormat = string;

/**
 * Escape a CSV field according to RFC 4180 standard
 * 
 * Rules:
 * - Fields containing comma, newline, or quote must be wrapped in double quotes
 * - Internal double quotes must be escaped by doubling them (" -> "")
 * - Null/undefined values return empty string
 * - Numbers are converted to strings
 * 
 * @param value - The value to escape (string, number, null, or undefined)
 * @returns Properly escaped CSV field string
 * 
 * @example
 * escapeCSVField('normal text') // 'normal text'
 * escapeCSVField('text, with comma') // '"text, with comma"'
 * escapeCSVField('text "with" quotes') // '"text ""with"" quotes"'
 * escapeCSVField(null) // ''
 * escapeCSVField(123.45) // '123.45'
 */
export function escapeCSVField(value: CSVFieldValue): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  const str = String(value);

  // RFC 4180: Quote if field contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    // Escape internal quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format a date for CSV export
 * 
 * Default format is 'dd/MM/yyyy' (UK standard) to match existing frontend exports.
 * Backend exports can use 'yyyy-MM-dd' (ISO format) by passing a custom format.
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @param formatStr - Optional date format string (default: 'dd/MM/yyyy')
 * @returns Formatted date string or empty string if date is invalid/null
 * 
 * @example
 * formatDate(new Date('2024-01-15')) // '15/01/2024'
 * formatDate('2024-01-15', 'yyyy-MM-dd') // '2024-01-15'
 * formatDate(null) // ''
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = DEFAULT_DATE_FORMAT
): string {
  if (!date) {
    return '';
  }

  try {
    // Handle string dates (ISO format)
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Validate date
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    return format(dateObj, formatStr);
  } catch (error) {
    // Return empty string on any parsing error
    return '';
  }
}

/**
 * Format money amount to 2 decimal places
 * 
 * Returns '0.00' for null, undefined, or NaN values.
 * Handles negative amounts correctly.
 * 
 * @param amount - Money amount (number, null, or undefined)
 * @returns Formatted money string with 2 decimal places
 * 
 * @example
 * formatMoney(123.456) // '123.46'
 * formatMoney(100) // '100.00'
 * formatMoney(null) // '0.00'
 * formatMoney(-50.5) // '-50.50'
 */
export function formatMoney(amount: number | null | undefined): string {
  // Handle null/undefined/NaN
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }

  // Format to 2 decimal places
  return amount.toFixed(2);
}

/**
 * Validate a CSV row before export
 * 
 * Checks for:
 * - Required fields are present and non-empty
 * - String fields don't exceed maximum length
 * - Numeric fields are valid numbers
 * 
 * @param row - Row object to validate
 * @param requiredFields - Array of required field names
 * @returns Array of error messages (empty if row is valid)
 * 
 * @example
 * validateCSVRow({ name: 'John', age: 30 }, ['name', 'age']) // []
 * validateCSVRow({ name: '' }, ['name']) // ['Field "name" is required']
 * validateCSVRow({ name: 'x'.repeat(1001) }, ['name']) // ['Field "name" exceeds maximum length']
 */
export function validateCSVRow(
  row: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  const errors: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    const value = row[field];

    // Check if field is missing or empty
    if (value === null || value === undefined || value === '') {
      errors.push(`Field "${field}" is required`);
      continue;
    }

    // Check string length
    if (typeof value === 'string' && value.length > MAX_FIELD_LENGTH) {
      errors.push(
        `Field "${field}" exceeds maximum length of ${MAX_FIELD_LENGTH} characters`
      );
    }

    // Check if numeric field is valid number
    if (
      typeof value === 'number' &&
      (isNaN(value) || !isFinite(value))
    ) {
      errors.push(`Field "${field}" must be a valid number`);
    }
  }

  return errors;
}

// ============================================================================
// Step 2 - Job Export Functions
// ============================================================================

/**
 * Calculate SoloWipe Platform Fee: (amount * 0.0075) + £0.30
 * This is the platform commission fee
 */
function calculatePlatformFee(amountPounds: number): number {
  return (amountPounds * 0.0075) + 0.30;
}

/**
 * Calculate GoCardless Processing Fee: (amount * 0.01) + £0.20, capped at £4.00
 * This is the standard GoCardless fee (separate from our platform fee)
 */
function calculateProcessingFee(amountPounds: number): number {
  const fee = (amountPounds * 0.01) + 0.20;
  return Math.min(fee, 4.00);
}

/**
 * Generate safe invoice number from job ID
 * Format: INV-{first 8 chars of id in uppercase}
 */
function generateInvoiceNumber(job: JobWithCustomer): string {
  if (job.invoice_number) {
    return job.invoice_number;
  }
  if (job.id) {
    return `INV-${job.id.slice(0, 8).toUpperCase()}`;
  }
  return 'INV-UNKNOWN';
}

/**
 * Calculate fees for a job, using stored values when available, otherwise calculating
 * Fees only apply to GoCardless payments; cash/transfer have no fees
 */
function calculateJobFees(job: JobWithCustomer): {
  platformFee: number;
  gocardlessFee: number;
  netAmount: number;
} {
  const isGoCardless = job.payment_method === 'gocardless';
  const grossAmount = job.amount_collected || 0;

  // Use stored fees if available, otherwise calculate
  const platformFee =
    job.platform_fee ??
    (isGoCardless ? calculatePlatformFee(grossAmount) : 0);

  const gocardlessFee =
    job.gocardless_fee ??
    (isGoCardless ? calculateProcessingFee(grossAmount) : 0);

  const netAmount =
    job.net_amount ??
    (isGoCardless ? grossAmount - platformFee - gocardlessFee : grossAmount);

  return { platformFee, gocardlessFee, netAmount };
}

/**
 * Export jobs to generic CSV format
 * 
 * Columns: Customer, Address, Date, Gross Amount, Payment Status, Payment Method,
 * Platform Fee, GoCardless Fee, Net Amount
 * 
 * @param jobs - Array of jobs with customer data
 * @param options - Export options
 * @param options.includeArchived - Include jobs from archived customers (default: false)
 * @returns CSV content string with header row
 */
export function exportJobsToCSV(
  jobs: JobWithCustomer[],
  options?: { includeArchived?: boolean }
): string {
  const includeArchived = options?.includeArchived ?? false;

  // Filter archived customers if needed
  const filteredJobs = includeArchived
    ? jobs
    : jobs.filter((job) => !job.customer?.is_archived);

  // Define headers
  const headers = [
    'Customer',
    'Address',
    'Date',
    'Gross Amount',
    'Payment Status',
    'Payment Method',
    'Platform Fee',
    'GoCardless Fee',
    'Net Amount',
  ];

  // Generate rows
  const rows = filteredJobs.map((job) => {
    const { platformFee, gocardlessFee, netAmount } = calculateJobFees(job);
    const grossAmount = job.amount_collected || 0;

    return [
      escapeCSVField(job.customer?.name),
      escapeCSVField(job.customer?.address),
      formatDate(job.completed_at),
      formatMoney(grossAmount),
      escapeCSVField(job.payment_status),
      escapeCSVField(job.payment_method),
      formatMoney(platformFee),
      formatMoney(gocardlessFee),
      formatMoney(netAmount),
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export jobs to Xero-compatible CSV format
 * 
 * Columns: *ContactName, EmailAddress, POAddressLine1, *InvoiceNumber, *InvoiceDate,
 * *DueDate, *Description, *Quantity, *UnitAmount, PlatformFee, ProcessingFee,
 * NetPayout, *AccountCode, *TaxType, Currency
 * 
 * @param jobs - Array of jobs with customer data
 * @param description - Service description for invoice (default: "Service")
 * @returns CSV content string with header row
 */
export function exportJobsToXero(
  jobs: JobWithCustomer[],
  description: string = 'Service'
): string {
  // Define headers (Xero invoice import format)
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

  // Generate rows
  const rows = jobs.map((job) => {
    const invoiceDate = formatDate(job.completed_at);
    const dueDate = formatDate(job.payment_date) || invoiceDate;
    const { platformFee, gocardlessFee, netAmount } = calculateJobFees(job);
    const grossAmount = job.amount_collected || 0;
    const invoiceNumber = generateInvoiceNumber(job);

    return [
      escapeCSVField(job.customer?.name),
      '', // EmailAddress - not stored
      escapeCSVField(job.customer?.address),
      escapeCSVField(invoiceNumber),
      escapeCSVField(invoiceDate),
      escapeCSVField(dueDate),
      escapeCSVField(description),
      '1', // Quantity - always 1
      formatMoney(grossAmount),
      formatMoney(platformFee),
      formatMoney(gocardlessFee),
      formatMoney(netAmount),
      // TODO: Future Xero category mapping - currently hardcoded
      '200', // AccountCode (Sales)
      'No VAT', // TaxType
      'GBP', // Currency
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export jobs for accountant (detailed format)
 * 
 * Columns: Invoice Number, Invoice Date, Customer Name, Customer Address,
 * Scheduled Date, Completed Date, Gross Amount, Payment Method, Payment Status,
 * Payment Date, Platform Fee, GoCardless Fee, Net Amount
 * 
 * @param jobs - Array of jobs with customer data
 * @returns CSV content string with header row
 */
export function exportJobsForAccountant(
  jobs: JobWithCustomer[]
): string {
  // Define headers
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Customer Name',
    'Customer Address',
    'Scheduled Date',
    'Completed Date',
    'Gross Amount',
    'Payment Method',
    'Payment Status',
    'Payment Date',
    'Platform Fee',
    'GoCardless Fee',
    'Net Amount',
  ];

  // Generate rows
  const rows = jobs.map((job) => {
    const { platformFee, gocardlessFee, netAmount } = calculateJobFees(job);
    const grossAmount = job.amount_collected || 0;
    const invoiceNumber = generateInvoiceNumber(job);

    return [
      escapeCSVField(invoiceNumber),
      formatDate(job.completed_at),
      escapeCSVField(job.customer?.name),
      escapeCSVField(job.customer?.address),
      formatDate(job.scheduled_date),
      formatDate(job.completed_at),
      formatMoney(grossAmount),
      escapeCSVField(job.payment_method),
      escapeCSVField(job.payment_status),
      formatDate(job.payment_date),
      formatMoney(platformFee),
      formatMoney(gocardlessFee),
      formatMoney(netAmount),
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * TODO: Export customers to Xero Contacts CSV format
 * 
 * @param customers - Array of customers
 * @returns CSV content string
 */
// export function exportCustomersToXero(customers: Customer[]): string {
//   // Implementation coming in Step 2
// }

// ============================================================================
// TODO: Implement in Stage D - Expense Export Functions
// ============================================================================

/**
 * Export expenses to CSV format
 * 
 * @param expenses - Array of expenses
 * @returns CSV content string
 */
export function exportExpenses(expenses: ExpenseWithJob[]): string {
  const headers = [
    'Date',
    'Category',
    'Amount',
    'Job ID',
    'Customer Name',
    'Notes',
    'Receipt URL',
  ];

  const rows = expenses.map(expense => [
    formatDate(expense.date),
    expense.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    formatMoney(expense.amount),
    expense.job_id || '',
    expense.job?.customer?.name || '',
    expense.notes || '',
    expense.photo_url || '',
  ]);

  return [headers.map(escapeCSVField).join(','), ...rows.map(row => row.map(escapeCSVField).join(','))].join('\n');
}

/**
 * TODO: Validate an expense row before export
 * 
 * Placeholder for future expense module implementation.
 * Do NOT implement until Stage D.
 * 
 * @param expense - Expense object to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateExpenseRow(expense: unknown): string[] {
  throw new Error(
    'validateExpenseRow() is not implemented yet. This will be added in Stage D.'
  );
}

// ============================================================================
// TODO: Implement in Stage C - Xero Integration Metadata
// ============================================================================

/**
 * TODO: Export metadata structure for future Xero integration
 */
// export interface ExportMetadata {
//   exportDate: string;
//   businessName: string;
//   dateRange: { start: string; end: string };
//   includeArchived: boolean;
//   totalRows: number;
// }

/**
 * TODO: Category mapping for Xero integration
 */
// export interface CategoryMapping {
//   accountCode: string;
//   taxType: string;
//   description: string;
// }

/**
 * TODO: Payment method mapping for Xero integration
 */
// export interface PaymentMethodMapping {
//   gocardless: CategoryMapping;
//   cash: CategoryMapping;
//   transfer: CategoryMapping;
// }

