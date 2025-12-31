/**
 * Currency Formatting Utilities
 * 
 * Centralized utilities for formatting currency values in UK format (£)
 */

/**
 * Formats a number as UK currency (£)
 * 
 * @param amount - The amount to format (in pounds)
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "£25.00")
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: {
    showDecimals?: boolean;
    showSymbol?: boolean;
  } = {}
): string {
  const { showDecimals = true, showSymbol = true } = options;

  // Handle null/undefined
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '£0.00' : '0.00';
  }

  // Format with or without decimals
  const formatted = showDecimals
    ? amount.toFixed(2)
    : Math.round(amount).toString();

  return showSymbol ? `£${formatted}` : formatted;
}

/**
 * Formats a number as UK currency with no decimal places
 * 
 * @param amount - The amount to format (in pounds)
 * @returns Formatted currency string (e.g., "£25")
 */
export function formatCurrencyWhole(amount: number | null | undefined): string {
  return formatCurrency(amount, { showDecimals: false });
}

/**
 * Formats a number as UK currency with decimals
 * 
 * @param amount - The amount to format (in pounds)
 * @returns Formatted currency string (e.g., "£25.00")
 */
export function formatCurrencyDecimal(amount: number | null | undefined): string {
  return formatCurrency(amount, { showDecimals: true });
}

/**
 * Formats a number as UK currency without symbol (for use in tables/charts)
 * 
 * @param amount - The amount to format (in pounds)
 * @returns Formatted amount string (e.g., "25.00")
 */
export function formatCurrencyNoSymbol(amount: number | null | undefined): string {
  return formatCurrency(amount, { showSymbol: false });
}

