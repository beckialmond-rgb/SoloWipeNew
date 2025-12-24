import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextCustomerButtonProps {
  phoneNumber: string | null | undefined;
  customerName: string;
  iconOnly?: boolean;
  className?: string;
}

export function TextCustomerButton({ 
  phoneNumber, 
  customerName, 
  iconOnly = false,
  className 
}: TextCustomerButtonProps) {
  // Don't render if no phone number
  if (!phoneNumber) {
    return null;
  }

  // Create SMS link with pre-filled message
  const smsMessage = encodeURIComponent(
    `Hi ${customerName}, SoloWipe here. Reminder that we are cleaning your windows tomorrow. Thanks!`
  );
  const smsLink = `sms:${phoneNumber.replace(/\s/g, '')}?body=${smsMessage}`;

  if (iconOnly) {
    return (
      <a
        href={smsLink}
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
      </a>
    );
  }

  return (
    <a
      href={smsLink}
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
    </a>
  );
}
