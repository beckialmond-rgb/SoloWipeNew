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

// Premium Input class helper with error state
export function getInputClassName(hasError: boolean) {
  return cn(
    "w-full h-14 px-4 rounded-xl input-premium",
    "bg-background border-2",
    "text-foreground placeholder:text-muted-foreground/60",
    "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:-translate-y-0.5",
    "transition-all duration-300 ease-out",
    "hover:border-primary/50 hover:shadow-md",
    hasError 
      ? "border-destructive focus:ring-destructive/20 focus:border-destructive" 
      : "border-border"
  );
}
