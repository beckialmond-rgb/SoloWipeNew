import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
  index: number;
}

export function CustomerCard({ customer, onClick, index }: CustomerCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "w-full bg-card rounded-2xl shadow-sm border border-border p-4",
        "flex items-center gap-4 text-left",
        "hover:bg-muted/50 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "fat-card"
      )}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">
          {customer.name}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{customer.address}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">
          £{customer.price}
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.button>
  );
}
