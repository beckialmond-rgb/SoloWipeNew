import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Fuel, Wrench, Package, Receipt, Link2, Calendar } from 'lucide-react';
import { Expense, ExpenseWithJob } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExpenseDetailModal } from './ExpenseDetailModal';

interface ExpenseListProps {
  expenses: ExpenseWithJob[];
  onExpenseUpdated: () => void;
}

const categoryIcons = {
  cleaning_supplies: Sparkles,
  fuel: Fuel,
  equipment: Wrench,
  misc: Package,
};

const categoryLabels = {
  cleaning_supplies: 'Cleaning Supplies',
  fuel: 'Fuel',
  equipment: 'Equipment',
  misc: 'Misc',
};

export function ExpenseList({ expenses, onExpenseUpdated }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithJob | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No expenses yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add your first expense to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense, index) => {
          const Icon = categoryIcons[expense.category];
          const categoryLabel = categoryLabels[expense.category];

          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedExpense(expense)}
              className={cn(
                "bg-card rounded-xl border border-border p-4 cursor-pointer",
                "hover:border-primary/50 transition-colors"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Category Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  expense.category === 'cleaning_supplies' && "bg-blue-100 dark:bg-blue-900/30",
                  expense.category === 'fuel' && "bg-orange-100 dark:bg-orange-900/30",
                  expense.category === 'equipment' && "bg-purple-100 dark:bg-purple-900/30",
                  expense.category === 'misc' && "bg-gray-100 dark:bg-gray-900/30"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    expense.category === 'cleaning_supplies' && "text-blue-600 dark:text-blue-400",
                    expense.category === 'fuel' && "text-orange-600 dark:text-orange-400",
                    expense.category === 'equipment' && "text-purple-600 dark:text-purple-400",
                    expense.category === 'misc' && "text-gray-600 dark:text-gray-400"
                  )} />
                </div>

                {/* Expense Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{categoryLabel}</h3>
                    <p className="text-lg font-bold text-foreground">
                      £{expense.amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(expense.date), 'd MMM yyyy')}
                    </div>
                    {expense.job && (
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {expense.job.customer.name}
                      </div>
                    )}
                    {expense.photo_url && (
                      <div className="flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </div>
                    )}
                  </div>

                  {expense.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                      {expense.notes}
                    </p>
                  )}
                </div>

                {/* Photo Thumbnail */}
                {expense.photo_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0">
                    <img
                      src={expense.photo_url}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onUpdated={onExpenseUpdated}
        />
      )}
    </>
  );
}

