import Papa from 'papaparse';
import { format, parse, isValid } from 'date-fns';
import { downloadCSV } from './exportCSV';
import { sanitizeString, validateAndCleanPhoneNumber } from '@/lib/validations';

export interface CSVCustomerRow {
  name: string;
  address: string;
  mobile_phone: string | null;
  price: number;
  frequency_weeks: number;
  first_clean_date: string;
  preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
  notes?: string;
  errors?: string[];
  rowNumber: number;
}

export interface ParseResult {
  validRows: CSVCustomerRow[];
  invalidRows: CSVCustomerRow[];
  totalRows: number;
}

/**
 * Generate CSV template with headers and a dummy row
 */
export function generateCustomerCSVTemplate(): string {
  const headers = [
    'Name',
    'Address',
    'Mobile',
    'Price',
    'Frequency (Weeks)',
    'First Clean Date',
    'Preferred Payment Method',
    'Notes'
  ];

  // Dummy row with example data
  const dummyRow = [
    'John Smith',
    '123 High Street, London, SW1A 1AA',
    '07700123456',
    '25',
    '4',
    format(new Date(), 'yyyy-MM-dd'),
    'DD',
    'Regular customer'
  ];

  const csvContent = [
    headers.join(','),
    dummyRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV template file
 */
export function downloadCustomerCSVTemplate(): void {
  const csvContent = generateCustomerCSVTemplate();
  const filename = 'customer_import_template.csv';
  downloadCSV(csvContent, filename);
}

/**
 * Clean price value - strips currency symbols and commas, converts to number
 */
function cleanPrice(priceValue: string | number | undefined | null): number {
  if (typeof priceValue === 'number') {
    return priceValue;
  }
  
  if (!priceValue || typeof priceValue !== 'string') {
    return 20; // Default price
  }

  // Strip currency symbols, commas, and whitespace
  const cleaned = priceValue
    .replace(/[£$€,]/g, '')
    .trim();

  const parsed = parseFloat(cleaned);
  
  // Return default if invalid, otherwise return parsed value
  return isNaN(parsed) || parsed < 0 ? 20 : parsed;
}

/**
 * Clean frequency weeks - converts to integer
 */
function cleanFrequencyWeeks(frequencyValue: string | number | undefined | null): number {
  if (typeof frequencyValue === 'number') {
    return Math.max(1, Math.min(52, Math.round(frequencyValue)));
  }

  if (!frequencyValue || typeof frequencyValue !== 'string') {
    return 4; // Default frequency
  }

  const cleaned = frequencyValue.trim();
  const parsed = parseInt(cleaned, 10);
  
  // Return default if invalid, otherwise clamp between 1-52
  if (isNaN(parsed)) {
    return 4;
  }
  
  return Math.max(1, Math.min(52, parsed));
}

/**
 * Clean and parse date - accepts various formats, converts to YYYY-MM-DD
 */
function cleanDate(dateValue: string | undefined | null): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  if (!dateValue || typeof dateValue !== 'string') {
    return today; // Default to today
  }

  const trimmed = dateValue.trim();
  
  if (!trimmed) {
    return today;
  }

  // Try parsing various date formats
  const dateFormats = [
    'yyyy-MM-dd',      // ISO format
    'dd/MM/yyyy',      // UK format
    'MM/dd/yyyy',      // US format
    'dd-MM-yyyy',      // UK with dashes
    'yyyy/MM/dd',      // ISO with slashes
    'dd.MM.yyyy',      // UK with dots
  ];

  for (const dateFormat of dateFormats) {
    try {
      const parsed = parse(trimmed, dateFormat, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      // Try next format
      continue;
    }
  }

  // Try parsing as ISO string
  try {
    const isoDate = new Date(trimmed);
    if (isValid(isoDate)) {
      return format(isoDate, 'yyyy-MM-dd');
    }
  } catch {
    // Invalid date
  }

  // Return today if all parsing attempts fail
  return today;
}

/**
 * Clean phone number using existing validation logic
 */
function cleanPhone(phoneValue: string | undefined | null): string | null {
  if (!phoneValue || typeof phoneValue !== 'string') {
    return null;
  }

  const trimmed = phoneValue.trim();
  
  if (!trimmed) {
    return null;
  }

  const validation = validateAndCleanPhoneNumber(trimmed);
  
  // Return cleaned phone if valid, otherwise null (optional field)
  return validation.isValid ? (validation.cleaned || null) : null;
}

/**
 * Parse preferred payment method - accepts various formats
 */
function parsePreferredPaymentMethod(value: string | undefined | null): 'gocardless' | 'cash' | 'transfer' | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  
  // Map common variations
  if (cleaned === 'dd' || cleaned === 'direct debit' || cleaned === 'gocardless') return 'gocardless';
  if (cleaned === 'transfer' || cleaned === 'bank transfer' || cleaned === 'bank') return 'transfer';
  if (cleaned === 'cash') return 'cash';
  
  return null; // Invalid value - return null (optional field)
}

/**
 * Validate a parsed customer row
 */
function validateCustomerRow(row: CSVCustomerRow): string[] {
  const errors: string[] = [];

  // Name validation
  if (!row.name || row.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (row.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Address validation
  if (!row.address || row.address.trim().length === 0) {
    errors.push('Address is required');
  } else if (row.address.length > 500) {
    errors.push('Address must be less than 500 characters');
  }

  // Price validation
  if (row.price < 0) {
    errors.push('Price cannot be negative');
  } else if (row.price > 10000) {
    errors.push('Price seems too high (max £10,000)');
  }

  // Frequency validation
  if (row.frequency_weeks < 1 || row.frequency_weeks > 52) {
    errors.push('Frequency must be between 1 and 52 weeks');
  }

  // Phone validation (optional, but if provided should be valid)
  if (row.mobile_phone) {
    const validation = validateAndCleanPhoneNumber(row.mobile_phone);
    if (!validation.isValid) {
      errors.push(`Phone: ${validation.error || 'Invalid phone number format'}`);
    }
  }

  // Notes validation
  if (row.notes && row.notes.length > 2000) {
    errors.push('Notes must be less than 2000 characters');
  }

  return errors;
}

/**
 * Parse CSV file and clean/validate data
 */
export function parseCustomerCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names (case-insensitive, strip whitespace)
        const normalized = header.trim().toLowerCase();
        
        // Map various header formats to our expected names
        const headerMap: Record<string, string> = {
          'name': 'name',
          'customer name': 'name',
          'customer': 'name',
          'address': 'address',
          'mobile': 'mobile',
          'mobile phone': 'mobile',
          'phone': 'mobile',
          'phone number': 'mobile',
          'price': 'price',
          'cost': 'price',
          'amount': 'price',
          'frequency (weeks)': 'frequency',
          'frequency': 'frequency',
          'frequency_weeks': 'frequency',
          'weeks': 'frequency',
          'first clean date': 'first_clean_date',
          'first clean': 'first_clean_date',
          'clean date': 'first_clean_date',
          'date': 'first_clean_date',
          'scheduled date': 'first_clean_date',
          'preferred payment method': 'preferred_payment_method',
          'payment method': 'preferred_payment_method',
          'notes': 'notes',
          'note': 'notes',
        };

        return headerMap[normalized] || normalized;
      },
      complete: (results) => {
        try {
          const validRows: CSVCustomerRow[] = [];
          const invalidRows: CSVCustomerRow[] = [];

          const data = results.data as Record<string, any>[];
          
          data.forEach((row, index) => {
            // Skip completely empty rows
            const hasAnyData = Object.values(row).some(val => 
              val !== null && val !== undefined && String(val).trim() !== ''
            );
            
            if (!hasAnyData) {
              return;
            }

            const rowNumber = index + 2; // +2 because CSV is 1-indexed and has header row

            // Extract and clean values
            const name = sanitizeString(row.name || row.Name || '');
            const address = sanitizeString(row.address || row.Address || '');
            const mobileRaw = row.mobile || row.phone || row.Mobile || row.Phone || '';
            const priceRaw = row.price || row.Price || row.cost || row.Cost || '';
            const frequencyRaw = row.frequency || row.Frequency || row.weeks || row.Weeks || '';
            const dateRaw = row.first_clean_date || row.date || row.Date || row['first clean date'] || '';
            const preferredPaymentMethodRaw = row.preferred_payment_method || row['preferred payment method'] || row['payment method'] || '';
            const notesRaw = row.notes || row.Notes || '';

            const cleanedRow: CSVCustomerRow = {
              name,
              address,
              mobile_phone: cleanPhone(mobileRaw),
              price: cleanPrice(priceRaw),
              frequency_weeks: cleanFrequencyWeeks(frequencyRaw),
              first_clean_date: cleanDate(dateRaw),
              preferred_payment_method: parsePreferredPaymentMethod(preferredPaymentMethodRaw),
              notes: notesRaw ? sanitizeString(notesRaw) : undefined,
              rowNumber,
            };

            // Validate the row
            const errors = validateCustomerRow(cleanedRow);
            
            if (errors.length > 0) {
              cleanedRow.errors = errors;
              invalidRows.push(cleanedRow);
            } else {
              validRows.push(cleanedRow);
            }
          });

          resolve({
            validRows,
            invalidRows,
            totalRows: data.length,
          });
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

