import { useState, forwardRef, InputHTMLAttributes } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showIcon?: boolean;
  hasError?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showIcon = true, hasError = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        {showIcon && (
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        )}
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            "w-full h-14 pr-12 rounded-xl",
            "bg-muted border-0",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2",
            hasError ? "focus:ring-destructive ring-2 ring-destructive" : "focus:ring-primary",
            showIcon ? "pl-12" : "pl-4",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
