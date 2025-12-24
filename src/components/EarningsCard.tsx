import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface EarningsCardProps {
  amount: number;
  label: string;
}

export function EarningsCard({ amount, label }: EarningsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-success text-success-foreground rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5" />
        <span className="text-sm font-medium opacity-90">{label}</span>
      </div>
      <p className="text-4xl font-bold">
        £{amount.toFixed(2)}
      </p>
    </motion.div>
  );
}
