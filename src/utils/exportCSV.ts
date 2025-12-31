import { Customer } from '@/types/database';
import { format } from 'date-fns';

/**
 * CSV Export Utilities - Legacy Functions
 * 
 * NOTE: Job export functions have been migrated to src/services/csv.ts
 * The following functions remain here temporarily:
 * - downloadCSV() - Core download utility (still used across the app)
 * - exportCustomersToXero() - Will be migrated when csv.ts implements customer export
 * - downloadCustomersForXero() - Will be migrated when csv.ts implements customer export
 * 
 * See src/services/csv.ts for the centralized CSV service.
 */

/**
 * Download CSV content as a file
 * 
 * @param content - CSV content string
 * @param filename - Filename for the downloaded file
 */
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
 * 
 * TODO: Migrate to src/services/csv.ts when exportCustomersToXero() is implemented there
 * This function is temporarily kept here until the migration is complete.
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
 * 
 * TODO: Migrate to src/services/csv.ts when exportCustomersToXero() is implemented there
 * This function is temporarily kept here until the migration is complete.
 */
export function downloadCustomersForXero(customers: Customer[], businessName: string): void {
  const csv = exportCustomersToXero(customers);
  const sanitizedBusinessName = businessName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = format(new Date(), 'dd-MM-yyyy');
  const filename = `${sanitizedBusinessName}_Customers_Xero_${dateStr}.csv`;
  downloadCSV(csv, filename);
}
