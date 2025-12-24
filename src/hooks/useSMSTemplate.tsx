/**
 * SMS Template Hook
 * 
 * Provides a hook to intercept SMS button clicks and show template picker
 */

import { useState, useCallback } from 'react';
import {
  SMSTemplateCategory,
  SMSTemplateContext,
  SMSTriggerType,
} from '@/types/smsTemplates';
import { getCategoryFromTrigger } from '@/utils/smsTemplateUtils';

interface UseSMSTemplateReturn {
  showTemplatePicker: (triggerType: SMSTriggerType, context: SMSTemplateContext, onSend: (message: string) => void) => void;
  isPickerOpen: boolean;
  pickerCategory: SMSTemplateCategory | null;
  pickerContext: SMSTemplateContext | null;
  pickerOnSend: ((message: string) => void) | null;
  closePicker: () => void;
}

export function useSMSTemplate(): UseSMSTemplateReturn {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<SMSTemplateCategory | null>(null);
  const [pickerContext, setPickerContext] = useState<SMSTemplateContext | null>(null);
  const [pickerOnSend, setPickerOnSend] = useState<((message: string) => void) | null>(null);

  const showTemplatePicker = useCallback((
    triggerType: SMSTriggerType,
    context: SMSTemplateContext,
    onSend: (message: string) => void
  ) => {
    console.log('[useSMSTemplate] showTemplatePicker called', {
      triggerType,
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
    });
    
    try {
      const category = getCategoryFromTrigger(triggerType);
      console.log('[useSMSTemplate] Category resolved:', category);
      
      // Ensure context values are properly formatted (defensive programming)
      const safeContext: SMSTemplateContext = {
        ...context,
        customer_name: context.customer_name ? String(context.customer_name) : undefined,
        customer_firstName: context.customer_firstName ? String(context.customer_firstName) : undefined,
        customer_address: context.customer_address ? String(context.customer_address) : undefined,
        customer_addressLine1: context.customer_addressLine1 ? String(context.customer_addressLine1) : undefined,
        price: context.price !== undefined ? (typeof context.price === 'string' ? parseFloat(context.price) : context.price) : undefined,
        amount: context.amount !== undefined ? (typeof context.amount === 'string' ? parseFloat(context.amount) : context.amount) : undefined,
        business_name: context.business_name ? String(context.business_name) : undefined,
        date: context.date ? String(context.date) : undefined,
        completed_date: context.completed_date ? String(context.completed_date) : undefined,
        photo_url: context.photo_url ? String(context.photo_url) : undefined,
        dd_link: context.dd_link ? String(context.dd_link) : undefined,
      };
      
      console.log('[useSMSTemplate] Setting picker state', {
        category,
        hasSafeContext: !!safeContext,
        isPickerOpen: true,
      });
      
      setPickerCategory(category);
      setPickerContext(safeContext);
      setPickerOnSend(() => onSend); // Wrap in function to preserve closure
      setIsPickerOpen(true);
      
      console.log('[useSMSTemplate] Picker state set, should be opening now');
    } catch (error) {
      console.error('[useSMSTemplate] Error showing template picker:', error);
      // Fallback: call onSend directly with empty message so user can still send
      if (onSend) {
        onSend('');
      }
    }
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    // Clear context/category after a delay to allow Drawer animation to complete
    // This prevents DOM removal errors during animation
    setTimeout(() => {
      setPickerCategory(null);
      setPickerContext(null);
      setPickerOnSend(null);
    }, 500); // Increased delay to ensure Drawer cleanup completes
  }, []);

  return {
    showTemplatePicker,
    isPickerOpen,
    pickerCategory,
    pickerContext,
    pickerOnSend,
    closePicker,
  };
}

