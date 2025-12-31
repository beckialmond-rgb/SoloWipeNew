import { useState, useMemo, useCallback } from 'react';
import { useBillingHistory, BillingPeriod } from './useBillingHistory';
import { downloadCSV } from '@/utils/exportCSV';
import { format, startOfMonth, endOfMonth, subMonths, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

export interface ExportRow {
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  helper_name: string | null;
  helper_email: string | null;
  billing_start_date: string;
  billing_end_date: string | null;
  days_billed: number;
  monthly_rate: number;
  amount: number;
  stripe_subscription_item_id: string | null;
  is_active: boolean;
}

export type DateRangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'custom';

interface DateRange {
  preset: DateRangePreset;
  startDate: Date | null;
  endDate: Date | null;
}

interface UseBillingExportReturn {
  rows: ExportRow[];
  exportCSV: () => void;
  exportExcel: () => void;
  isGenerating: boolean;
  error: Error | null;
  summary: {
    totalHelpers: number;
    totalCost: number;
  };
  dateRange: DateRange;
  setDateRange: (preset: DateRangePreset, startDate?: Date, endDate?: Date) => void;
  isValidRange: boolean;
}

/**
 * Calculate date range based on preset
 */
function calculateDateRange(preset: DateRangePreset, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'this_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    case 'last_3_months':
      return {
        startDate: subMonths(now, 3),
        endDate: now,
      };
    case 'custom':
      if (!customStart || !customEnd) {
        // Fallback to this month if custom dates not provided
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      }
      return {
        startDate: customStart,
        endDate: customEnd,
      };
    default:
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
  }
}

/**
 * Filter billing periods by date range
 * Period overlaps with range if:
 * period.period_start <= range.endDate AND period.period_end >= range.startDate
 */
function filterByDateRange(periods: BillingPeriod[], startDate: Date, endDate: Date): BillingPeriod[] {
  return periods.filter(period => {
    // Period overlaps with range if it starts before range ends and ends after range starts
    return period.period_start <= endDate && period.period_end >= startDate;
  });
}

/**
 * Transform BillingPeriod to ExportRow
 */
function transformToExportRow(period: BillingPeriod): ExportRow {
  return {
    invoice_number: period.invoice_number,
    billing_period_start: period.billing_period_start,
    billing_period_end: period.billing_period_end,
    helper_name: period.helper_name,
    helper_email: period.helper_email || '',
    billing_start_date: period.billing_start_date,
    billing_end_date: period.billing_end_date,
    days_billed: period.days_billed,
    monthly_rate: period.monthly_rate,
    amount: period.amount,
    stripe_subscription_item_id: period.stripe_subscription_item_id,
    is_active: period.is_active,
  };
}

/**
 * Escape CSV field - handles commas, quotes, and newlines
 */
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV content from export rows
 */
function generateCSV(rows: ExportRow[]): string {
  const headers = [
    'Invoice Number',
    'Billing Period Start',
    'Billing Period End',
    'Helper Name',
    'Helper Email',
    'Billing Start Date',
    'Billing End Date',
    'Days Billed',
    'Monthly Rate',
    'Amount',
    'Stripe Subscription Item ID',
    'Is Active',
  ];

  const csvRows = rows.map(row => [
    escapeCSVField(row.invoice_number),
    escapeCSVField(row.billing_period_start),
    escapeCSVField(row.billing_period_end),
    escapeCSVField(row.helper_name),
    escapeCSVField(row.helper_email),
    escapeCSVField(row.billing_start_date),
    escapeCSVField(row.billing_end_date),
    escapeCSVField(String(row.days_billed)),
    escapeCSVField(String(row.monthly_rate)),
    escapeCSVField(String(row.amount)),
    escapeCSVField(row.stripe_subscription_item_id),
    escapeCSVField(row.is_active ? 'Yes' : 'No'),
  ]);

  return [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Generate Excel workbook from export rows
 */
function generateExcel(rows: ExportRow[]): XLSX.WorkBook {
  // Create worksheet data
  const headers = [
    'Invoice Number',
    'Billing Period Start',
    'Billing Period End',
    'Helper Name',
    'Helper Email',
    'Billing Start Date',
    'Billing End Date',
    'Days Billed',
    'Monthly Rate',
    'Amount',
    'Stripe Subscription Item ID',
    'Is Active',
  ];

  const worksheetData = [
    headers,
    ...rows.map(row => [
      row.invoice_number,
      row.billing_period_start,
      row.billing_period_end,
      row.helper_name || '',
      row.helper_email || '',
      row.billing_start_date,
      row.billing_end_date || '',
      row.days_billed,
      row.monthly_rate,
      row.amount,
      row.stripe_subscription_item_id || '',
      row.is_active ? 'Yes' : 'No',
    ]),
  ];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Invoice Number
    { wch: 20 }, // Billing Period Start
    { wch: 20 }, // Billing Period End
    { wch: 20 }, // Helper Name
    { wch: 30 }, // Helper Email
    { wch: 20 }, // Billing Start Date
    { wch: 20 }, // Billing End Date
    { wch: 12 }, // Days Billed
    { wch: 12 }, // Monthly Rate
    { wch: 12 }, // Amount
    { wch: 35 }, // Stripe Subscription Item ID
    { wch: 10 }, // Is Active
  ];

  // Format header row (bold)
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E0E0E0' } },
    };
  }

  // Format amount and monthly rate columns as currency (columns I and J, indices 8 and 9)
  const amountColIndex = 9;
  const rateColIndex = 8;
  const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let row = dataRange.s.r + 1; row <= dataRange.e.r; row++) {
    const amountCell = XLSX.utils.encode_cell({ r: row, c: amountColIndex });
    const rateCell = XLSX.utils.encode_cell({ r: row, c: rateColIndex });
    if (worksheet[amountCell]) {
      worksheet[amountCell].z = '£#,##0.00';
    }
    if (worksheet[rateCell]) {
      worksheet[rateCell].z = '£#,##0.00';
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Helper Billing');

  return workbook;
}

/**
 * Download Excel file
 */
function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}

export function useBillingExport(): UseBillingExportReturn {
  const { history, isLoading: historyLoading, error: historyError } = useBillingHistory();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRangeState] = useState<DateRange>({
    preset: 'this_month',
    startDate: null,
    endDate: null,
  });

  // Calculate date range dates
  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateRange.preset, dateRange.startDate || undefined, dateRange.endDate || undefined);
  }, [dateRange.preset, dateRange.startDate, dateRange.endDate]);

  // Validate date range
  const isValidRange = useMemo(() => {
    if (dateRange.preset === 'custom') {
      if (!dateRange.startDate || !dateRange.endDate) return false;
      return !isAfter(dateRange.startDate, dateRange.endDate);
    }
    return true;
  }, [dateRange]);

  // Filter periods by date range
  const filteredPeriods = useMemo(() => {
    if (!isValidRange) return [];
    return filterByDateRange(history, startDate, endDate);
  }, [history, startDate, endDate, isValidRange]);

  // Transform to export rows
  const rows = useMemo(() => {
    return filteredPeriods.map(transformToExportRow);
  }, [filteredPeriods]);

  // Calculate summary
  const summary = useMemo(() => {
    const uniqueHelpers = new Set(filteredPeriods.map(p => p.helper_id));
    const totalCost = filteredPeriods.reduce((sum, period) => sum + period.cost, 0);
    return {
      totalHelpers: uniqueHelpers.size,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    };
  }, [filteredPeriods]);

  // Set date range
  const setDateRange = useCallback((preset: DateRangePreset, customStart?: Date, customEnd?: Date) => {
    setDateRangeState({
      preset,
      startDate: customStart || null,
      endDate: customEnd || null,
    });
  }, []);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (rows.length === 0) {
      toast({
        title: 'No data to export',
        description: 'No billing data found for the selected period.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidRange) {
      toast({
        title: 'Invalid date range',
        description: 'Please select a valid date range.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const csvContent = generateCSV(rows);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const filename = `Billing_Export_${startDateStr}_to_${endDateStr}.csv`;
      
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export downloaded',
        description: 'CSV file has been downloaded successfully.',
      });
    } catch (error) {
      console.error('[useBillingExport] CSV export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to generate CSV export. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [rows, startDate, endDate, isValidRange, toast]);

  // Export Excel
  const exportExcel = useCallback(() => {
    if (rows.length === 0) {
      toast({
        title: 'No data to export',
        description: 'No billing data found for the selected period.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidRange) {
      toast({
        title: 'Invalid date range',
        description: 'Please select a valid date range.',
        variant: 'destructive',
      });
      return;
    }

    // Warn for large datasets
    if (rows.length > 10000) {
      toast({
        title: 'Large dataset',
        description: 'This export contains a large amount of data and may take a moment to generate.',
        duration: 5000,
      });
    }

    setIsGenerating(true);
    try {
      const workbook = generateExcel(rows);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const filename = `Billing_Export_${startDateStr}_to_${endDateStr}.xlsx`;
      
      downloadExcel(workbook, filename);
      
      toast({
        title: 'Export downloaded',
        description: 'Excel file has been downloaded successfully.',
      });
    } catch (error) {
      console.error('[useBillingExport] Excel export error:', error);
      
      // Fallback to CSV on Excel failure
      toast({
        title: 'Excel export failed',
        description: 'Falling back to CSV format.',
        variant: 'default',
      });
      
      try {
        const csvContent = generateCSV(rows);
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        const filename = `Billing_Export_${startDateStr}_to_${endDateStr}.csv`;
        downloadCSV(csvContent, filename);
      } catch (csvError) {
        console.error('[useBillingExport] CSV fallback error:', csvError);
        toast({
          title: 'Export failed',
          description: 'Failed to generate export. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [rows, startDate, endDate, isValidRange, toast]);

  return {
    rows,
    exportCSV,
    exportExcel,
    isGenerating,
    error: historyError,
    summary,
    dateRange,
    setDateRange,
    isValidRange,
  };
}

