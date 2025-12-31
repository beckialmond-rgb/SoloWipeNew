import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatSummaryCardProps {
  icon?: LucideIcon;
  value: string | number;
  label: string;
  subText?: string | React.ReactNode;
  iconBg?: string;
  valueColor?: string;
  className?: string;
  showIcon?: boolean;
}

export function StatSummaryCard({
  icon: Icon,
  value,
  label,
  subText,
  iconBg = "bg-blue-500 dark:bg-blue-500",
  valueColor = "text-white dark:text-white",
  className,
  showIcon = true
}: StatSummaryCardProps) {
  // Format value - handle numbers and strings
  const displayValue = typeof value === 'number' 
    ? value.toLocaleString('en-GB') 
    : value;

  // Calculate character count for responsive scaling
  const valueLength = String(displayValue).length;
  
  // Dynamic font size based on character count and viewport
  // For 1-2 digits: larger, 3 digits: medium, 4+ digits: smaller
  const getFontSize = () => {
    if (valueLength <= 2) {
      return 'clamp(1.75rem, 6vw, 2.5rem)'; // 28px - 40px for small numbers
    } else if (valueLength === 3) {
      return 'clamp(1.5rem, 5vw, 2rem)'; // 24px - 32px for 3-digit numbers
    } else {
      return 'clamp(1.25rem, 4vw, 1.75rem)'; // 20px - 28px for large numbers
    }
  };

  return (
    <div className={cn(
      "bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out",
      className
    )}>
      {showIcon && Icon && (
        <div className={cn("w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full flex items-center justify-center mb-3 shadow-md", iconBg)}>
          <Icon className="w-6 h-6 md:w-7 md:h-7 text-white dark:text-white" />
        </div>
      )}
      {!showIcon && (
        <p className="text-slate-200 dark:text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wide">{label}</p>
      )}
      <div className="min-w-0 overflow-hidden">
        <p 
          className={cn(
            "font-extrabold leading-tight break-words",
            valueColor,
            showIcon ? "text-center" : ""
          )}
          style={{
            fontSize: getFontSize(),
            lineHeight: '1.2',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {displayValue}
        </p>
      </div>
      {showIcon && (
        <p className="text-slate-200 dark:text-slate-200 text-xs md:text-sm font-semibold text-center mt-2 uppercase tracking-wide">
          {label}
        </p>
      )}
      {subText && (
        <div className={showIcon ? "mt-2 text-center" : "mt-2"}>
          {typeof subText === 'string' ? (
            <p className="text-slate-200 dark:text-slate-300 text-xs font-medium">{subText}</p>
          ) : (
            subText
          )}
        </div>
      )}
    </div>
  );
}

