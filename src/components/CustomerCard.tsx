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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-full w-full"
    >
      <button
        onClick={onClick}
        className={cn(
          "w-full h-full bg-card rounded-xl shadow-depth-2 border-2 border-border p-5",
          "flex items-center justify-between gap-5 text-left",
          "hover:bg-muted/50 active:bg-muted/70 transition-all duration-300 ease-out touch-sm min-h-[88px]",
          "hover:shadow-depth-3 hover:-translate-y-1 hover:border-primary/30",
          "focus:outline-none focus:ring-4 focus:ring-primary/20 focus:ring-offset-2",
          "overflow-hidden card-premium"
        )}
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-2 min-w-0 flex-nowrap">
            <h3 className="font-bold text-foreground truncate text-xl flex-shrink min-w-0">
              {customer.name}
            </h3>
            {/* Status indicators */}
            <div className="flex items-center gap-1.5 shrink-0">
              {customer.notes && (
                <StickyNote className="w-5 h-5 text-warning flex-shrink-0" title="Has notes" />
              )}
              {customer.gocardless_mandate_status === 'pending' ? (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 dark:bg-warning/25 text-warning dark:text-warning text-xs font-semibold flex-shrink-0 border border-warning/30 dark:border-warning/40"
                  title="DD Pending"
                >
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  Pending
                </span>
              ) : customer.gocardless_id ? (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 dark:bg-success/25 text-success dark:text-success text-xs font-semibold flex-shrink-0 border border-success/30 dark:border-success/40"
                  title="Direct Debit Active"
                >
                  <CreditCard className="w-3 h-3 flex-shrink-0" />
                  DD
                </span>
              ) : null}
            </div>
          </div>
          
          {/* Compact info grid */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="truncate break-words">{customer.address?.split(/[,\n]/)[0].trim() || 'No address'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-foreground text-xl">
            £{customer.price}
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </button>
    </motion.div>
  );
}
