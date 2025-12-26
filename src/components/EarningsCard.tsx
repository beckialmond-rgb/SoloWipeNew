import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarningsCardProps {
  amount: number;
  label: string;
  className?: string;
}

export function EarningsCard({ amount, label, className }: EarningsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-500",
        "dark:from-green-700 dark:via-green-600 dark:to-emerald-600",
        "text-white rounded-2xl p-6 shadow-xl overflow-hidden",
        className
      )}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white/90">{label}</span>
        </div>
        <p className="text-4xl font-bold text-white drop-shadow-sm min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          £{amount.toFixed(2)}
        </p>
      </div>
    </motion.div>
  );
}
