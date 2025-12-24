/**
 * SMS Template Utilities
 * 
 * Handles template storage, retrieval, and variable replacement
 */

import { 
  SMSTemplateCategory, 
  SMSTemplateContext, 
  SMSTemplateCategoryConfig,
  DEFAULT_SMS_TEMPLATES,
  SMS_TEMPLATES_STORAGE_KEY,
  SMSTriggerType,
  SMS_TRIGGER_TO_CATEGORY_MAP,
} from '@/types/smsTemplates';

// This function is now primarily used by SMSTemplatePicker component
// The main data source is via useSMSTemplates hook which uses Supabase

/**
 * Get user-customized templates from localStorage (fallback only)
 * NOTE: This is now a fallback. Primary storage is in Supabase via useSMSTemplates hook
 * Falls back to defaults if not set
 */
export function getSMSTemplates(): Record<SMSTemplateCategory, SMSTemplateCategoryConfig> {
  try {
    const stored = localStorage.getItem(SMS_TEMPLATES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (parsed && typeof parsed === 'object') {
        // Merge with defaults to ensure all categories exist
        const merged: Record<SMSTemplateCategory, SMSTemplateCategoryConfig> = { ...DEFAULT_SMS_TEMPLATES };
        Object.keys(DEFAULT_SMS_TEMPLATES).forEach((category) => {
          if (parsed[category] && parsed[category].templates && Array.isArray(parsed[category].templates)) {
            merged[category as SMSTemplateCategory] = parsed[category];
          }
        });
        return merged;
      }
    }
  } catch (error) {
    console.error('[SMS Templates] Error loading templates from localStorage:', error);
  }
  return DEFAULT_SMS_TEMPLATES;
}

/**
 * Save user-customized templates to localStorage (fallback only)
 * NOTE: This is now a fallback. Primary storage is in Supabase via useSMSTemplates hook
 */
export function saveSMSTemplates(templates: Record<SMSTemplateCategory, SMSTemplateCategoryConfig>): void {
  try {
    localStorage.setItem(SMS_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('[SMS Templates] Error saving templates to localStorage:', error);
  }
}

/**
 * Get templates for a specific category
 */
export function getTemplatesForCategory(category: SMSTemplateCategory): SMSTemplateCategoryConfig {
  const allTemplates = getSMSTemplates();
  return allTemplates[category] || DEFAULT_SMS_TEMPLATES[category];
}

/**
 * Get category from trigger type
 */
export function getCategoryFromTrigger(triggerType: SMSTriggerType): SMSTemplateCategory {
  return SMS_TRIGGER_TO_CATEGORY_MAP[triggerType] || 'general';
}

/**
 * Replace template variables with actual values
 * 
 * Supported variables:
 * - {{customer_name}} - Full customer name
 * - {{customer_firstName}} - First name only
 * - {{customer_address}} - Full address
 * - {{customer_addressLine1}} - First line of address
 * - {{price}} or {{amount}} - Price/amount
 * - {{business_name}} - Business name
 * - {{date}} - Formatted date
 * - {{completed_date}} - Formatted completion date
 * - {{photo_url}} - Photo URL (will be added as separate text)
 * - {{dd_link}} - Direct Debit authorization URL
 */
export function replaceTemplateVariables(
  template: string,
  context: SMSTemplateContext
): string {
  try {
    // Ensure template is a string
    let result = String(template || '');

    // Ensure context is valid
    if (!context || typeof context !== 'object') {
      console.warn('[replaceTemplateVariables] Invalid context provided:', context);
      return result;
    }

    // Helper to safely convert price/amount to formatted string
    // Returns empty string if value is undefined/null/0 to prevent showing £0.00
    const formatPrice = (value: string | number | undefined | null): string => {
      try {
        if (value === undefined || value === null) return '';
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (isNaN(num) || num <= 0) return '';
        return num.toFixed(2);
      } catch (error) {
        console.error('[replaceTemplateVariables] Error formatting price:', error, value);
        return '';
      }
    };

    // Helper to safely convert to string and extract first name
    const safeGetFirstName = (name: string | undefined): string => {
      if (!name || typeof name !== 'string') return 'there';
      const parts = name.split(' ');
      return parts[0] || 'there';
    };

    // Helper to safely extract first line of address
    const safeGetAddressLine1 = (address: string | undefined): string => {
      if (!address || typeof address !== 'string') return '';
      const lines = address.split(/[,\n]/);
      return (lines[0] || '').trim();
    };

    // Get the best available price (job_total > price > amount)
    const bestPrice = context.job_total !== undefined && context.job_total > 0 
      ? context.job_total 
      : (context.price !== undefined && context.price > 0 
        ? context.price 
        : (context.amount !== undefined && context.amount > 0 ? context.amount : undefined));
    const bestAmount = context.amount !== undefined && context.amount > 0
      ? context.amount
      : bestPrice;
    
      // Replace standard variables
    const replacements: Record<string, string> = {
    customer_name: String(context.customer_name || context.customer_firstName || 'Customer'),
    customer_firstName: String(context.customer_firstName || safeGetFirstName(context.customer_name) || 'there'),
    customer_address: String(context.customer_address || ''),
    customer_addressLine1: String(context.customer_addressLine1 || safeGetAddressLine1(context.customer_address)),
    price: formatPrice(bestPrice),
    amount: formatPrice(bestAmount),
    job_total: formatPrice(bestPrice),
    business_name: String(context.business_name || 'SoloWipe'),
    date: String(context.date || ''),
    scheduled_date: String(context.scheduled_date || context.date || ''),
    scheduled_time: String(context.scheduled_time || ''),
    completed_date: String(context.completed_date || ''),
    dd_link: String(context.dd_link || ''),
    review_link: String(context.review_link || ''),
    new_price: formatPrice(context.new_price !== undefined ? context.new_price : context.price),
    current_price: formatPrice(context.current_price),
    service_type: String(context.service_type || 'Window Clean'),
    referral_code: String(context.referral_code || ''),
    payment_method: String(context.payment_method || ''),
  };
    
    // Add any additional context properties that might be passed
    Object.keys(context).forEach(key => {
    if (!replacements[key] && context[key] !== undefined && context[key] !== null) {
      try {
        const value = context[key];
        // Safely convert to string, handling objects and arrays
        if (typeof value === 'object' && value !== null) {
          replacements[key] = JSON.stringify(value);
        } else {
          replacements[key] = String(value);
        }
      } catch (error) {
        console.error(`[replaceTemplateVariables] Error converting ${key} to string:`, error);
        replacements[key] = '';
        }
      }
    });

    // First pass: Handle price variables with special formatting
    // Check template context BEFORE replacement to determine the right format
    const hasAmountDue = result.includes('Amount due');
    const hasTotalForService = result.includes('Total for service') || result.includes('Total for today') || result.includes('Total:');
    
    // job_total takes priority - format it based on template context
    if (replacements.job_total && replacements.job_total !== '') {
      if (hasAmountDue) {
        // Template already says "Amount due: £" so just add the value
        result = result.replace(/\{\{job_total\}\}/g, replacements.job_total);
      } else if (hasTotalForService) {
        // Template already says "Total for service: £" or "Total:" so just add the value
        result = result.replace(/\{\{job_total\}\}/g, replacements.job_total);
      } else {
        // Default: Add "Total for service: £X.XX"
        result = result.replace(/\{\{job_total\}\}/g, ` Total for service: £${replacements.job_total}`);
      }
    } else {
      // If job_total is empty, remove it and any preceding price text (but keep the rest of the message)
      result = result.replace(/\s*(Total(?: for service| for today)?[:]?\s*£?)?\s*(Amount due[:]?\s*£?)?\s*\{\{job_total\}\}\s*\.?/g, '');
    }
    
    // Handle price variable (only if job_total wasn't used)
    if (!result.includes('Total for service') && !hasAmountDue) {
      if (replacements.price && replacements.price !== '') {
        result = result.replace(/\{\{price\}\}/g, ` Total: £${replacements.price}`);
      } else {
        result = result.replace(/\s*(Total[:]?\s*£?)?\s*\{\{price\}\}\s*/g, '');
      }
    } else {
      // Remove price placeholder if job_total was already formatted
      result = result.replace(/\{\{price\}\}/g, '');
    }
    
    // Handle amount variable
    if (replacements.amount && replacements.amount !== '') {
      result = result.replace(/\{\{amount\}\}/g, ` £${replacements.amount}`);
    } else {
      result = result.replace(/\{\{amount\}\}/g, '');
    }
    
    // Special handling for scheduled_date when it's "today" - remove preceding "on " BEFORE general replacement
    if (replacements.scheduled_date && replacements.scheduled_date.toLowerCase() === 'today') {
      // Replace "on {{scheduled_date}}" with just "today" (removing "on " and the space before it)
      result = result.replace(/\s+on\s+\{\{scheduled_date\}\}/gi, ' today');
      // Also handle cases where there's no space before "on" (at start of sentence)
      result = result.replace(/\bon\s+\{\{scheduled_date\}\}/gi, 'today');
    }
    
    // Replace all other variables normally (except photo_url which is handled specially below)
    Object.entries(replacements).forEach(([key, value]) => {
      // Skip price variables (already handled above) and photo_url (handled specially below)
      if (key !== 'price' && key !== 'amount' && key !== 'job_total' && key !== 'photo_url' && key !== 'referral_code') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value);
      }
    });
    
    // Handle referral_code - make it stand out if present
    if (replacements.referral_code && replacements.referral_code !== '') {
      // Replace {{referral_code}} with the code, making it prominent
      result = result.replace(/\{\{referral_code\}\}/g, replacements.referral_code);
    } else {
      // Remove {{referral_code}} placeholder if no code provided
      result = result.replace(/\{\{referral_code\}\}/g, '');
    }
    
    // Clean up any "on today" patterns that might have been created (safety check)
    result = result.replace(/\s+on\s+today\s+/gi, ' today ');
    result = result.replace(/\s+on\s+today$/i, ' today');

    // Handle photo_url specially - it should be added with proper spacing if present
    if (context.photo_url) {
      // Replace {{photo_url}} placeholder with actual URL
      // Check if there's a period before the placeholder (common in receipt templates)
      if (result.includes('.{{photo_url}}')) {
        // Replace ".{{photo_url}}" with period, space, and the URL
        result = result.replace(/\.\s*\{\{photo_url\}\}/g, `. ${String(context.photo_url)}`);
      } else {
        // Otherwise, add space before the URL
        result = result.replace(/\{\{photo_url\}\}/g, ` ${String(context.photo_url)}`);
      }
    } else {
      // Remove {{photo_url}} and any leading period/whitespace if no photo
      result = result.replace(/\.\s*\{\{photo_url\}\}/g, '.');
      result = result.replace(/\s*\{\{photo_url\}\}/g, '');
    }

    // Clean up any double spaces (but preserve newlines for SMS formatting)
    result = result.replace(/[ \t]+/g, ' ').trim();

    // Ensure business name footer is added if not already present
    // This ensures every message includes the cleaner's business name for professionalism
    const businessName = String(context.business_name || '').trim();
    if (businessName && businessName !== 'SoloWipe' && businessName !== '') {
      // First, replace any remaining {{business_name}} variables that weren't caught earlier
      result = result.replace(/\{\{business_name\}\}/g, businessName);
      
      // Check if business name is already at the end of the message
      const businessNameLower = businessName.toLowerCase();
      const resultLower = result.toLowerCase().trim();
      const endsWithBusinessName = resultLower.endsWith(` - ${businessNameLower}`) || resultLower.endsWith(businessNameLower);
      
      // Only add footer if business name is not already at the end
      // If it appears in the middle of the message, we still add it at the end for consistency
      if (!endsWithBusinessName) {
        // Add business name footer with proper formatting
        // Use dash separator for professional appearance
        result = `${result.trim()} - ${businessName}`;
      }
    } else if (!businessName || businessName === 'SoloWipe') {
      // If no business name or default, remove any remaining {{business_name}} placeholders
      result = result.replace(/\s*-\s*\{\{business_name\}\}/g, '');
      result = result.replace(/\{\{business_name\}\}/g, '');
    }

    return result;
  } catch (error) {
    console.error('[replaceTemplateVariables] Error replacing template variables:', error, { template, context });
    // Return the original template if replacement fails
    return String(template || '');
  }
}

/**
 * Get the default template ID for a category
 */
export function getDefaultTemplateId(category: SMSTemplateCategory): string {
  const categoryConfig = getTemplatesForCategory(category);
  return categoryConfig.defaultTemplateId || categoryConfig.templates[0]?.id || 'professional';
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(category: SMSTemplateCategory, templateId: string) {
  const categoryConfig = getTemplatesForCategory(category);
  return categoryConfig.templates.find(t => t.id === templateId) || categoryConfig.templates[0];
}

