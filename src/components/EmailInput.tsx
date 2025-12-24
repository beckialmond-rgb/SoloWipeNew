import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Mail, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailValidation } from '@/hooks/useEmailValidation';

interface EmailInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showIcon?: boolean;
  validation?: EmailValidation;
  showValidation?: boolean;
}

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, showIcon = true, validation, showValidation = true, onBlur, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    
    const showError = showValidation && touched && validation && !validation.isEmpty && !validation.isValid;
    const showSuccess = showValidation && touched && validation && !validation.isEmpty && validation.isValid;

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      onBlur?.(e);
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          {showIcon && (
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          )}
          <input
            ref={ref}
            type="email"
            className={cn(
              "w-full h-14 pr-12 rounded-xl",
              "bg-muted border-0",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2",
              showError ? "focus:ring-destructive ring-2 ring-destructive" : "focus:ring-primary",
              showIcon ? "pl-12" : "pl-4",
              className
            )}
            onBlur={handleBlur}
            {...props}
          />
          {showValidation && touched && !validation?.isEmpty && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {showSuccess ? (
                <Check className="w-5 h-5 text-success" />
              ) : showError ? (
                <AlertCircle className="w-5 h-5 text-destructive" />
              ) : null}
            </div>
          )}
        </div>
        {showError && validation?.error && (
          <p className="text-xs text-destructive flex items-center gap-1 pl-1">
            <AlertCircle className="w-3 h-3" />
            {validation.error}
          </p>
        )}
      </div>
    );
  }
);

EmailInput.displayName = 'EmailInput';
