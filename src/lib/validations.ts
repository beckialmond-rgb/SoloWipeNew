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
    .regex(/^[\d\s\-+()]*$/, 'Phone number contains invalid characters')
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
