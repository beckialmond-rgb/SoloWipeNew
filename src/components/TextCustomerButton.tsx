import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { openSMSApp, prepareSMSContext } from '@/utils/openSMS';

interface TextCustomerButtonProps {
  phoneNumber: string | null | undefined;
  customerName: string;
  iconOnly?: boolean;
  className?: string;
  businessName?: string;
  customerAddress?: string;
  jobPrice?: number;
  scheduledDate?: string; // Job scheduled date (ISO format)
}

export function TextCustomerButton({ 
  phoneNumber, 
  customerName,
  iconOnly = false,
  className,
  businessName = 'SoloWipe',
  customerAddress,
  jobPrice,
  scheduledDate,
}: TextCustomerButtonProps) {
  const { showTemplatePicker } = useSMSTemplateContext();

  // Don't render if no phone number
  if (!phoneNumber) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use jobPrice if valid (> 0), otherwise use undefined
    const priceValue = jobPrice && jobPrice > 0 ? jobPrice : undefined;

    const context = prepareSMSContext({
      customerName,
      customerAddress,
      price: priceValue,
      jobTotal: priceValue,
      scheduledDate,
      businessName,
      serviceType: 'Window Clean',
    });

    showTemplatePicker('text_customer_button', context, (message) => {
      openSMSApp(phoneNumber, message);
    });
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg",
          "bg-green-600 hover:bg-green-700 text-white",
          "transition-colors shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          className
        )}
        aria-label={`Send text to ${customerName}`}
        title={`Send text to ${customerName}`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium",
        "text-white bg-green-600 hover:bg-green-700",
        "rounded-lg transition-colors shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
        className
      )}
    >
      <MessageSquare className="w-4 h-4" />
      Send Text
    </button>
  );
}
