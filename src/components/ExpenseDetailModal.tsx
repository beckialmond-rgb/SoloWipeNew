import { useState, useEffect } from 'react';
import { Sparkles, Fuel, Wrench, Package, X, Edit2, Trash2, Calendar, Link2, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseWithJob } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AddExpenseModal } from './AddExpenseModal';

interface ExpenseDetailModalProps {
  expense: ExpenseWithJob;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
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

export function ExpenseDetailModal({ expense, isOpen, onClose, onUpdated }: ExpenseDetailModalProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const Icon = categoryIcons[expense.category];
  const categoryLabel = categoryLabels[expense.category];

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) {
        // Handle 404 gracefully - table doesn't exist yet
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          toast({
            title: 'Expenses feature not available',
            description: 'The expenses table has not been set up yet. Please run the migration.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Expense deleted',
        description: 'The expense has been removed.',
      });

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete expense. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                expense.category === 'cleaning_supplies' && "bg-blue-100 dark:bg-blue-900/30",
                expense.category === 'fuel' && "bg-orange-100 dark:bg-orange-900/30",
                expense.category === 'equipment' && "bg-purple-100 dark:bg-purple-900/30",
                expense.category === 'misc' && "bg-gray-100 dark:bg-gray-900/30"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  expense.category === 'cleaning_supplies' && "text-blue-600 dark:text-blue-400",
                  expense.category === 'fuel' && "text-orange-600 dark:text-orange-400",
                  expense.category === 'equipment' && "text-purple-600 dark:text-purple-400",
                  expense.category === 'misc' && "text-gray-600 dark:text-gray-400"
                )} />
              </div>
              {categoryLabel}
            </DialogTitle>
            <DialogDescription>
              Expense details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Amount */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                £{expense.amount.toFixed(2)}
              </p>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </div>
              <p className="text-foreground font-medium">
                {format(new Date(expense.date), 'EEEE, d MMMM yyyy')}
              </p>
            </div>

            {/* Linked Job */}
            {expense.job && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="w-4 h-4" />
                  <span>Linked Job</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">{expense.job.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{expense.job.customer.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expense.job.completed_at
                      ? format(new Date(expense.job.completed_at), 'd MMM yyyy')
                      : format(new Date(expense.job.scheduled_date), 'd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Receipt Photo */}
            {expense.photo_url && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  <span>Receipt</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={expense.photo_url}
                    alt="Receipt"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {expense.notes && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-foreground">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setIsEditModalOpen(true)}
              disabled={isDeleting}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal - reuse AddExpenseModal */}
      {isEditModalOpen && (
        <AddExpenseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            onUpdated();
            onClose();
          }}
          expense={expense}
        />
      )}
    </>
  );
}

