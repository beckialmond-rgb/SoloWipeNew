/**
 * SMS Template System Types
 * 
 * This file defines the template categories and structure for the Smart Template Overlay.
 * It maps each SMS CTA to a category and defines the available templates.
 */

export type SMSTemplateCategory = 
  | 'tomorrow_reminder'
  | 'receipt'
  | 'direct_debit_invite'
  | 'unpaid_reminder'
  | 'rain_check'
  | 'on_my_way'
  | 'review_request'
  | 'price_increase'
  | 'referral'
  | 'general';

export interface SMSTemplate {
  id: string;
  name: string; // e.g., "Professional", "Casual", "Friendly"
  message: string; // Template with {{variables}}
  isDefault?: boolean;
}

export interface SMSTemplateCategoryConfig {
  category: SMSTemplateCategory;
  displayName: string; // e.g., "Tomorrow Reminder"
  description: string;
  templates: SMSTemplate[];
  defaultTemplateId: string;
}

/**
 * Context data available for template variable injection
 */
export interface SMSTemplateContext {
  customer_name?: string;
  customer_firstName?: string;
  customer_address?: string;
  customer_addressLine1?: string;
  price?: number;
  amount?: number;
  job_total?: number; // Total price for the specific job
  business_name?: string;
  date?: string;
  scheduled_date?: string; // Job scheduled date
  scheduled_time?: string; // Formatted scheduled time
  completed_date?: string;
  photo_url?: string;
  dd_link?: string; // Direct Debit authorization URL
  review_link?: string; // Google review link
  new_price?: number; // For price increase notifications
  current_price?: number; // For price increase notifications
  is_gocardless_active?: boolean; // Whether customer has active Direct Debit
  service_type?: string; // Service description (e.g., "Window Clean")
  referral_code?: string; // Referral code for family/friends promotion
  payment_method?: string; // Payment method: 'cash', 'transfer', 'gocardless', 'Direct Debit'
  [key: string]: string | number | boolean | undefined; // Allow additional variables
}

/**
 * Mapping of SMS trigger functions to template categories
 * 
 * This allows us to intercept SMS calls and determine which category to show
 */
export type SMSTriggerType =
  | 'tomorrow_sms_button'           // TomorrowSMSButton component
  | 'text_customer_button'          // TextCustomerButton component
  | 'receipt_sms'                   // CompletedJobItem send receipt
  | 'dd_invite_sms'                 // CustomerDetailModal sendDDLinkViaSMS
  | 'dd_setup_modal_sms'            // DirectDebitSetupModal handleSendSms
  | 'dd_bulk_invite'                // Customers.tsx bulk DD invite
  | 'unpaid_reminder'                // UnpaidJobCard handleSendReminder
  | 'customer_detail_reminder'      // CustomerDetailModal sendSmsReminder
  | 'rain_check'                    // RescheduleJobModal or weather-related
  | 'on_my_way'                     // OnMyWayButton
  | 'review_request'                // AskForReviewButton
  | 'price_increase'                // PriceIncreaseWizard sendPriceUpdateSMS
  | 'referral_sms';                 // Money page referral SMS

export const SMS_TRIGGER_TO_CATEGORY_MAP: Record<SMSTriggerType, SMSTemplateCategory> = {
  tomorrow_sms_button: 'tomorrow_reminder',
  text_customer_button: 'general',
  receipt_sms: 'receipt',
  dd_invite_sms: 'direct_debit_invite',
  dd_setup_modal_sms: 'direct_debit_invite',
  dd_bulk_invite: 'direct_debit_invite',
  unpaid_reminder: 'unpaid_reminder',
  customer_detail_reminder: 'general',
  rain_check: 'rain_check',
  on_my_way: 'on_my_way',
  review_request: 'review_request',
  price_increase: 'price_increase',
  referral_sms: 'referral',
};

/**
 * Default templates for each category
 * These will be stored in localStorage and can be customized by the user
 */
export const DEFAULT_SMS_TEMPLATES: Record<SMSTemplateCategory, SMSTemplateCategoryConfig> = {
  tomorrow_reminder: {
    category: 'tomorrow_reminder',
    displayName: 'Tomorrow Reminder',
    description: 'Reminders sent the day before a scheduled job',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, just a quick reminder that I\'m scheduled for your service at {{customer_addressLine1}} on {{scheduled_date}}. Total for service: £{{job_total}}. - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}! Quick reminder - I\'ll be at yours for your service at {{customer_addressLine1}} on {{scheduled_date}}. Total: £{{job_total}}. Thanks! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, just letting you know I\'ll be at yours on {{scheduled_date}} for your service at {{customer_addressLine1}}. Total for service: £{{job_total}}. See you then! 😊 - {{business_name}}',
      },
    ],
  },
  receipt: {
    category: 'receipt',
    displayName: 'Service Receipt',
    description: 'Receipts sent after job completion',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, your service at {{customer_addressLine1}} is complete. Total for service: £{{job_total}}. Payment method: {{payment_method}}.{{photo_url}} Thank you for your business! - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}! Service all done at {{customer_addressLine1}}. Total: £{{job_total}}. Payment: {{payment_method}}.{{photo_url}} Cheers! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, all done at {{customer_addressLine1}}! Total for service: £{{job_total}}. Payment: {{payment_method}}.{{photo_url}} Thanks so much! 😊 - {{business_name}}',
      },
    ],
  },
  direct_debit_invite: {
    category: 'direct_debit_invite',
    displayName: 'Direct Debit Invite',
    description: 'Invitations to set up Direct Debit payment',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, I\'ve moved my billing to an automated system with GoCardless. It\'s safer and means you never have to remember to pay me! Set it up in 30 seconds here: {{dd_link}} - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, I\'ve set up Direct Debit for payments - much easier! Set it up here: {{dd_link}} - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, I\'ve made payments easier with Direct Debit! No more remembering to pay 😊 Set it up here: {{dd_link}} - {{business_name}}',
      },
    ],
  },
  unpaid_reminder: {
    category: 'unpaid_reminder',
    displayName: 'Payment Reminder',
    description: 'Reminders for unpaid jobs',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, {{business_name}} here. Just a friendly reminder about your service from {{completed_date}}. Amount due: £{{job_total}}. Thanks so much!',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, just a reminder about your service from {{completed_date}}. Amount due: £{{job_total}}. Thanks! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, hope you\'re well! Just a quick reminder about your service from {{completed_date}}. Amount due: £{{job_total}}. Thanks! 😊 - {{business_name}}',
      },
    ],
  },
  rain_check: {
    category: 'rain_check',
    displayName: 'Rain Check',
    description: 'Messages about weather-related rescheduling',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, due to weather conditions, I\'ll need to reschedule your window clean. I\'ll contact you soon with a new date. Thank you for your understanding.',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, weather isn\'t great today so I\'ll reschedule. I\'ll let you know the new date soon. Thanks!',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, looks like the weather isn\'t playing nice today! I\'ll reschedule and let you know the new date. Thanks for understanding! 😊',
      },
    ],
  },
  on_my_way: {
    category: 'on_my_way',
    displayName: 'On My Way',
    description: 'Messages sent when heading to a customer',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, I\'m on my way to {{customer_addressLine1}} for your window clean. I should be with you shortly. - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, on my way to yours now! See you soon. - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, just letting you know I\'m on my way to {{customer_addressLine1}}! See you in a bit 😊 - {{business_name}}',
      },
    ],
  },
  review_request: {
    category: 'review_request',
    displayName: 'Review Request',
    description: 'Requests for Google reviews',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, thank you for choosing {{business_name}}! If you\'re happy with the service, I\'d really appreciate a quick review: {{review_link}} Thank you! - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, if you\'re happy with the clean, a quick review would be amazing: {{review_link}} Thanks! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, hope you\'re happy with the clean! If you have a moment, I\'d love a review: {{review_link}} Thanks so much! 😊 - {{business_name}}',
      },
    ],
  },
  price_increase: {
    category: 'price_increase',
    displayName: 'Price Increase',
    description: 'Notifications about price increases',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, due to rising material and fuel costs, your service price will increase to £{{new_price}} starting from your next visit. Your current price is £{{current_price}}. Thank you for your continued support! - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, just letting you know the price is going up to £{{new_price}} from next time (currently £{{current_price}}). Thanks for understanding! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, hope you\'re well! Due to costs going up, the price will be £{{new_price}} from your next service (currently £{{current_price}}). Thanks so much for your continued support! 😊 - {{business_name}}',
      },
    ],
  },
  referral: {
    category: 'referral',
    displayName: 'Friends & Family Referral',
    description: 'Referral messages for your customers to share with their friends and family',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, I\'m offering your friends and family their first service FREE! Share this code {{referral_code}} with them. They can text me with their name, address, and phone number to claim their free service. - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}! Got a deal for your friends and family - first service is FREE! Share code {{referral_code}} with them. They just need to text me their name, address, and phone number. Let\'s grow together! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}! 🎉 Special offer - your friends and family get their first service completely FREE! Share code {{referral_code}} with them. They can reply with their name, address, and phone number. Thanks for spreading the word! - {{business_name}}',
      },
    ],
  },
  general: {
    category: 'general',
    displayName: 'General Message',
    description: 'General customer messages',
    defaultTemplateId: 'professional',
    templates: [
      {
        id: 'professional',
        name: 'Professional',
        isDefault: true,
        message: 'Hi {{customer_firstName}}, just a quick message to check in. Hope everything is well with you. - {{business_name}}',
      },
      {
        id: 'casual',
        name: 'Casual',
        message: 'Hey {{customer_firstName}}, just checking in. Hope you\'re doing well! - {{business_name}}',
      },
      {
        id: 'friendly',
        name: 'Friendly',
        message: 'Hi {{customer_firstName}}, hope you\'re well! Just wanted to touch base. Let me know if you need anything! 😊 - {{business_name}}',
      },
    ],
  },
};

/**
 * Storage key for user-customized templates
 */
export const SMS_TEMPLATES_STORAGE_KEY = 'solowipe_sms_templates';

