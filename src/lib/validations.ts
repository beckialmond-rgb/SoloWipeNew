import { z } from 'zod';

// Customer validation schema
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  mobile_phone: z
    .string()
    .trim()
    .max(20, 'Phone number must be less than 20 characters')
    .refine(
      (val) => {
        if (!val || val === '') return true; // Optional field
        const validation = validateAndCleanPhoneNumber(val);
        return validation.isValid;
      },
      (val) => {
        const validation = validateAndCleanPhoneNumber(val);
        return { message: validation.error || 'Invalid phone number format' };
      }
    )
    .optional()
    .or(z.literal('')),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(10000, 'Price seems too high'),
  frequency_weeks: z
    .number()
    .int('Frequency must be a whole number')
    .min(1, 'Frequency must be at least 1 week')
    .max(52, 'Frequency cannot exceed 52 weeks'),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
});

// Quick add customer schema (subset of full customer schema)
export const quickAddCustomerSchema = z.object({
  name: customerSchema.shape.name,
  address: customerSchema.shape.address,
  price: customerSchema.shape.price,
});

// Job notes validation schema
export const jobNotesSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
});

// Business name validation schema
export const businessNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be less than 100 characters'),
});

// Google review link validation schema
export const googleReviewLinkSchema = z.object({
  link: z
    .string()
    .trim()
    .url('Please enter a valid URL')
    .max(500, 'URL is too long')
    .optional()
    .or(z.literal('')),
});

// Helper function to validate and return errors
export type ValidationResult<T> = 
  | { success: true; data: T; errors?: never }
  | { success: false; errors: Record<string, string>; data?: never };

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

// Helper to sanitize string input (removes potential XSS)
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Phone number validation and cleaning for UK numbers
 * Validates UK phone number formats and cleans them for storage
 */
export function validateAndCleanPhoneNumber(phone: string | null | undefined): {
  isValid: boolean;
  cleaned?: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { isValid: true, cleaned: null }; // Phone is optional
  }

  // Remove all whitespace, dashes, parentheses, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+()]/g, '');

  // Empty after cleaning is valid (optional field)
  if (!cleaned) {
    return { isValid: true, cleaned: null };
  }

  // Check if it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number can only contain numbers, spaces, dashes, parentheses, or +',
    };
  }

  // UK phone number validation
  // Valid formats:
  // - Mobile: 07xxxxxxxxx (11 digits starting with 07)
  // - Landline: 01x xxxx xxxx, 02x xxxx xxxx (10-11 digits)
  // - International: +44... (validated separately if starts with +44)
  // - Short codes: 3-6 digits (for special services)

  const length = cleaned.length;

  // Too short or too long
  if (length < 3 || length > 15) {
    return {
      isValid: false,
      error: 'Phone number must be between 3 and 15 digits',
    };
  }

  // UK mobile numbers (11 digits starting with 07)
  if (length === 11 && cleaned.startsWith('07')) {
    return { isValid: true, cleaned };
  }

  // UK landline numbers (10-11 digits starting with 01 or 02)
  if ((length === 10 || length === 11) && (cleaned.startsWith('01') || cleaned.startsWith('02'))) {
    return { isValid: true, cleaned };
  }

  // International format starting with 44 (UK country code)
  if (length >= 12 && cleaned.startsWith('44')) {
    return { isValid: true, cleaned };
  }

  // Short codes (3-6 digits) - accept but warn
  if (length >= 3 && length <= 6) {
    return { isValid: true, cleaned };
  }

  // If we get here, it's an unusual format but not necessarily invalid
  // Accept it but store cleaned version
  return {
    isValid: true,
    cleaned,
  };
}

/**
 * Clean phone number for display/storage (removes formatting)
 */
export function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const result = validateAndCleanPhoneNumber(phone);
  return result.cleaned ?? null;
}
