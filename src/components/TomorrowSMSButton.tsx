import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { openSMSApp, prepareSMSContext } from '@/utils/openSMS';

interface TomorrowSMSButtonProps {
  phoneNumber: string | null | undefined;
  customerName: string;
  customerAddress: string;
  jobPrice?: number;
  scheduledDate?: string; // Job scheduled date (ISO format)
  isGoCardlessActive?: boolean; // Customer has active DD mandate
  iconOnly?: boolean;
  className?: string;
  onClick?: () => void;
  businessName?: string;
  jobId?: string; // Optional job ID for SMS history tracking
}

export function TomorrowSMSButton({ 
  phoneNumber, 
  customerName,
  customerAddress,
  jobPrice,
  scheduledDate,
  isGoCardlessActive = false,
  iconOnly = false,
  className,
  onClick,
  businessName = 'SoloWipe',
  jobId,
}: TomorrowSMSButtonProps) {
  const { showTemplatePicker } = useSMSTemplateContext();

  // Don't render if no phone number
  if (!phoneNumber) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick();
    }

    // Use jobPrice if valid (> 0), otherwise use undefined (let template handle it)
    const priceValue = jobPrice && jobPrice > 0 ? jobPrice : undefined;

    const context = prepareSMSContext({
      customerName,
      customerAddress,
      price: priceValue,
      scheduledDate,
      isGoCardlessActive,
      businessName,
      serviceType: 'Window Clean',
    });

    showTemplatePicker('tomorrow_sms_button', context, (message) => {
      openSMSApp(phoneNumber, message, undefined, jobId);
    });
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg",
          "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300",
          "transition-colors shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
          className
        )}
        aria-label={`Send reminder text to ${customerName}`}
        title={`Send reminder text to ${customerName}`}
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
        "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300",
        "rounded-lg transition-colors shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        className
      )}
    >
      <MessageSquare className="w-4 h-4" />
      Send Reminder
    </button>
  );
}

