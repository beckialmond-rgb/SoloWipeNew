/**
 * SMS Template Context Provider
 * 
 * Provides global access to the SMS template picker throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useSMSTemplate } from '@/hooks/useSMSTemplate';
import { SMSTemplatePicker } from '@/components/SMSTemplatePicker';
import {
  SMSTemplateCategory,
  SMSTemplateContext,
  SMSTriggerType,
} from '@/types/smsTemplates';

interface SMSTemplateContextType {
  showTemplatePicker: (triggerType: SMSTriggerType, context: SMSTemplateContext, onSend: (message: string) => void) => void;
}

const SMSContext = createContext<SMSTemplateContextType | undefined>(undefined);

export function SMSTemplateProvider({ children }: { children: ReactNode }) {
  const {
    showTemplatePicker,
    isPickerOpen,
    pickerCategory,
    pickerContext,
    pickerOnSend,
    closePicker,
  } = useSMSTemplate();

  const handleSelectTemplate = (message: string) => {
    if (pickerOnSend) {
      pickerOnSend(message);
    }
  };

  return (
    <SMSContext.Provider value={{ showTemplatePicker }}>
      {children}
      {/* Always render picker but control with open prop to prevent DOM unmount errors */}
      <SMSTemplatePicker
        isOpen={isPickerOpen}
        onClose={closePicker}
        category={pickerCategory || 'general'}
        context={pickerContext || {
          customer_name: '',
          customer_firstName: '',
          customer_address: '',
          customer_addressLine1: '',
          price: 0,
          amount: 0,
          business_name: '',
        }}
        onSelectTemplate={handleSelectTemplate}
      />
    </SMSContext.Provider>
  );
}

export function useSMSTemplateContext() {
  const context = useContext(SMSContext);
  if (context === undefined) {
    throw new Error('useSMSTemplateContext must be used within SMSTemplateProvider');
  }
  return context;
}

