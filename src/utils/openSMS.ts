/**
 * SMS Opening Utility
 * 
 * Handles opening SMS with template picker interception
 */

import {
  SMSTriggerType,
  SMSTemplateContext,
} from '@/types/smsTemplates';
import { trackSMSSend } from './trackSMSSend';
import { validateAndCleanPhoneNumber } from '@/lib/validations';

/**
 * Opens SMS app with the given message
 * This is the final function called after template selection
 * @param phoneNumber - The phone number to send SMS to
 * @param message - The message to send
 * @param userId - Optional user ID for usage tracking
 */
export function openSMSApp(
  phoneNumber: string | null | undefined, 
  message: string,
  userId?: string
): void {
  if (!phoneNumber) {
    console.error('[openSMSApp] No phone number provided');
    return;
  }

  // Track SMS send if userId is provided (non-blocking)
  if (userId) {
    trackSMSSend(userId).catch(err => {
      console.error('[openSMSApp] Failed to track SMS send:', err);
      // Don't block SMS opening if tracking fails
    });
  }

  try {
    // Use validation function to clean phone number properly
    const validation = validateAndCleanPhoneNumber(phoneNumber);
    
    if (!validation.isValid || !validation.cleaned) {
      console.error('[openSMSApp] Invalid phone number:', validation.error);
      return;
    }
    
    const phone = validation.cleaned;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const encodedMessage = encodeURIComponent(String(message));
    const smsLink = `sms:${phone}${separator}body=${encodedMessage}`;
    window.open(smsLink, '_blank');
  } catch (error) {
    console.error('[openSMSApp] Error opening SMS:', error);
  }
}

/**
 * Prepare SMS context for template picker
 * This function extracts relevant data from the component context
 * Enhanced with job-specific data and payment status checks
 */
export function prepareSMSContext(
  context: {
    customerName?: string;
    customerFirstName?: string;
    customerAddress?: string;
    price?: number;
    amount?: number;
    jobTotal?: number; // Specific job amount
    businessName?: string;
    date?: string;
    scheduledDate?: string; // Job scheduled date (ISO format)
    scheduledTime?: string; // Formatted time string
    completedDate?: string;
    photoUrl?: string;
    ddLink?: string;
    review_link?: string;
    isGoCardlessActive?: boolean; // Customer has active DD mandate
    serviceType?: string;
    paymentMethod?: string; // Payment method: 'cash', 'transfer', 'gocardless', 'Direct Debit'
    [key: string]: string | number | boolean | undefined;
  }
): SMSTemplateContext {
  const firstName = context.customerFirstName || context.customerName?.split(' ')[0] || '';
  const addressLine1 = context.customerAddress?.split(/[,\n]/)[0].trim() || '';

  // Priority: jobTotal > amount > price (ensures we get the actual job price, not default)
  const priceValue = context.jobTotal !== undefined && context.jobTotal > 0
    ? (typeof context.jobTotal === 'string' ? parseFloat(context.jobTotal) : context.jobTotal)
    : (context.price !== undefined && context.price > 0
      ? (typeof context.price === 'string' ? parseFloat(context.price) : context.price)
      : (context.amount !== undefined && context.amount > 0
        ? (typeof context.amount === 'string' ? parseFloat(context.amount) : context.amount)
        : undefined));
  
  const amountValue = context.amount !== undefined && context.amount > 0
    ? (typeof context.amount === 'string' ? parseFloat(context.amount) : context.amount)
    : (context.jobTotal !== undefined && context.jobTotal > 0
      ? (typeof context.jobTotal === 'string' ? parseFloat(context.jobTotal) : context.jobTotal)
      : (context.price !== undefined && context.price > 0
        ? (typeof context.price === 'string' ? parseFloat(context.price) : context.price)
        : undefined));

  // Format scheduled date/time if provided
  let formattedScheduledDate: string | undefined;
  let formattedScheduledTime: string | undefined;
  if (context.scheduledDate) {
    try {
      const date = new Date(context.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const jobDate = new Date(date);
      jobDate.setHours(0, 0, 0, 0);
      
      // Check if the date is today
      if (jobDate.getTime() === today.getTime()) {
        formattedScheduledDate = 'today';
      } else {
        formattedScheduledDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      formattedScheduledTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      formattedScheduledDate = context.scheduledDate;
    }
  }

  const prepared: SMSTemplateContext = {
    customer_name: context.customerName || 'Customer',
    customer_firstName: firstName || 'there',
    customer_address: context.customerAddress,
    customer_addressLine1: addressLine1,
    price: priceValue,
    amount: amountValue,
    job_total: context.jobTotal ? (typeof context.jobTotal === 'string' ? parseFloat(context.jobTotal) : context.jobTotal) : priceValue,
    business_name: context.businessName || 'SoloWipe',
    date: context.date,
    scheduled_date: formattedScheduledDate || context.scheduledDate,
    scheduled_time: formattedScheduledTime || context.scheduledTime,
    completed_date: context.completedDate,
    photo_url: context.photoUrl,
    dd_link: context.ddLink,
    review_link: context.review_link,
    is_gocardless_active: context.isGoCardlessActive || false,
    service_type: context.serviceType || 'Window Clean',
    payment_method: context.paymentMethod || '',
  };
  
  // Debug logging to help diagnose data flow issues
  if (process.env.NODE_ENV === 'development') {
    console.log('[prepareSMSContext] Prepared context:', {
      customerName: prepared.customer_name,
      price: prepared.price,
      job_total: prepared.job_total,
      businessName: prepared.business_name,
      scheduledDate: prepared.scheduled_date,
    });
  }
  
  // Add any additional context properties
  Object.keys(context).forEach(key => {
    if (!['customerName', 'customerFirstName', 'customerAddress', 'price', 'amount', 'jobTotal', 'businessName', 'date', 'scheduledDate', 'scheduledTime', 'completedDate', 'photoUrl', 'ddLink', 'review_link', 'isGoCardlessActive', 'serviceType'].includes(key)) {
      prepared[key] = context[key];
    }
  });

  return prepared;
}

