import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  icon?: ReactNode;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  icon, 
  required, 
  error, 
  children,
  className 
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className={cn(
        "flex items-center gap-2 text-sm mb-2",
        error ? "text-destructive" : "text-muted-foreground"
      )}>
        {icon}
        {label}
        {required && ' *'}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
          {error}
        </p>
      )}
    </div>
  );
}

// Input class helper with error state
export function getInputClassName(hasError: boolean) {
  return cn(
    "w-full h-14 px-4 rounded-xl",
    "bg-muted border-2",
    "text-foreground placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-primary",
    "transition-colors",
    hasError 
      ? "border-destructive focus:ring-destructive" 
      : "border-transparent"
  );
}
