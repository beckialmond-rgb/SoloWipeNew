import { motion } from 'framer-motion';
import { ChevronRight, MapPin, StickyNote, CreditCard, Clock } from 'lucide-react';
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
      "w-full bg-card rounded-xl shadow-sm border border-border p-4",
      "flex items-center gap-4 text-left",
      "hover:bg-muted/50 transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      "!h-[72px] !max-h-[72px] sm:!h-[80px] sm:!max-h-[80px] md:!h-[88px] md:!max-h-[88px]",
      "overflow-hidden flex-shrink-0 box-border"
    )}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-foreground truncate text-base max-w-[70%]">
            {customer.name}
          </h3>
          {customer.notes && (
            <StickyNote className="w-4 h-4 text-warning flex-shrink-0" />
          )}
          {/* Mandate Status Badge */}
          {customer.gocardless_mandate_status === 'pending' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium flex-shrink-0">
              <Clock className="w-2.5 h-2.5" />
              Pending
            </span>
          ) : customer.gocardless_id ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium flex-shrink-0">
              <CreditCard className="w-2.5 h-2.5" />
              DD
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground min-w-0 overflow-hidden">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate min-w-0 whitespace-nowrap">{customer.address}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="font-bold text-foreground text-lg">
          £{customer.price}
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.button>
  );
}
