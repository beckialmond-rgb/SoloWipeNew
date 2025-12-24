import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (GBP)
 * @param amount - The amount to format
 * @param includeSymbol - Whether to include the £ symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, includeSymbol = true): string {
  // Ensure amount is a valid number
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  // Round to 2 decimal places
  const rounded = Math.round(numAmount * 100) / 100;
  
  // Format with 2 decimal places
  const formatted = rounded.toFixed(2);
  
  return includeSymbol ? `£${formatted}` : formatted;
}

/**
 * Parse a currency string or number to a valid amount
 * Handles empty strings, invalid inputs, and ensures value is within valid range
 * @param value - The value to parse (string or number)
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 10000)
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(value: string | number, min = 0, max = 10000): number | null {
  if (value === '' || value === null || value === undefined) {
    return min;
  }
  
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(numValue)) {
    return null;
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(numValue * 100) / 100;
  
  // Clamp to valid range
  if (rounded < min) return min;
  if (rounded > max) return max;
  
  return rounded;
}

/**
 * Validate currency amount
 * @param amount - The amount to validate
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 10000)
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCurrency(amount: number, min = 0, max = 10000): { isValid: boolean; error?: string } {
  if (isNaN(amount) || typeof amount !== 'number') {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (amount < min) {
    return { isValid: false, error: `Amount must be at least £${min.toFixed(2)}` };
  }
  
  if (amount > max) {
    return { isValid: false, error: `Amount cannot exceed £${max.toFixed(2)}` };
  }
  
  return { isValid: true };
}
