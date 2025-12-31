import { useState, useEffect } from 'react';
import { Calendar, Camera, X, Sparkles, Fuel, Wrench, Package, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { JobWithCustomer, ExpenseWithJob } from '@/types/database';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ExpenseCategory = 'cleaning_supplies' | 'fuel' | 'equipment' | 'misc';

const categoryOptions: { value: ExpenseCategory; label: string; icon: typeof Sparkles }[] = [
  { value: 'cleaning_supplies', label: 'Cleaning Supplies', icon: Sparkles },
  { value: 'fuel', label: 'Fuel', icon: Fuel },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'misc', label: 'Misc', icon: Package },
];

export function AddExpenseModal({ isOpen, onClose, onSuccess, expense }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [jobId, setJobId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<JobWithCustomer[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Fetch recent completed jobs for linking
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const jobs = (data || []).map(job => ({
          ...job,
          customer: job.customer as JobWithCustomer['customer'],
        })) as JobWithCustomer[];

        setAvailableJobs(jobs);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [isOpen, user]);

  // Reset form when modal closes or load expense data when editing
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setCategory('misc');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setJobId(null);
      setPhotoUrl(null);
      setNotes('');
    } else if (expense) {
      // Edit mode: populate form with expense data
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDate(expense.date);
      setJobId(expense.job_id || null);
      setPhotoUrl(expense.photo_url || null);
      setNotes(expense.notes || '');
    }
  }, [isOpen, expense]);

  const handlePhotoCapture = (url: string) => {
    setPhotoUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add expenses.',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photo if captured but not yet uploaded
      let finalPhotoUrl = photoUrl;
      if (photoUrl && !photoUrl.startsWith('http')) {
        // Photo is base64, need to upload
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const filename = `${user.id}/expense-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filename, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);

        if (signedUrlError) throw signedUrlError;
        finalPhotoUrl = signedUrlData.signedUrl;
      }

      if (expense) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: amountNum,
            category,
            date,
            job_id: jobId || null,
            photo_url: finalPhotoUrl,
            notes: notes.trim() || null,
          })
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
          title: 'Expense updated!',
          description: `£${amountNum.toFixed(2)} expense updated.`,
        });
      } else {
        // Create new expense
        const { error } = await supabase
          .from('expenses')
          .insert({
            owner_id: user.id,
            amount: amountNum,
            category,
            date,
            job_id: jobId || null,
            photo_url: finalPhotoUrl,
            notes: notes.trim() || null,
          });

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
          title: 'Expense added!',
          description: `£${amountNum.toFixed(2)} expense recorded.`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add expense. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedJob = availableJobs.find(j => j.id === jobId);
  const CategoryIcon = categoryOptions.find(c => c.value === category)?.icon || Package;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            Track your business expenses with receipts and job links.
          </DialogDescription>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (£)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  £
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-12"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCategory(option.value)}
                      disabled={isSubmitting}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        category === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium text-foreground">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-12 h-12"
                  max={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
            </div>

            {/* Link to Job (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="job">Link to Job (Optional)</Label>
              <select
                id="job"
                value={jobId || ''}
                onChange={(e) => setJobId(e.target.value || null)}
                disabled={isSubmitting || isLoadingJobs}
                className={cn(
                  "w-full h-12 px-4 rounded-xl border border-border bg-background",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <option value="">No job linked</option>
                {availableJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.customer.name} - {format(new Date(job.completed_at || job.scheduled_date), 'd MMM yyyy')} - £{job.amount_collected || job.customer.price}
                  </option>
                ))}
              </select>
              {selectedJob && (
                <p className="text-xs text-muted-foreground">
                  Linked to: {selectedJob.customer.name}
                </p>
              )}
            </div>

            {/* Receipt Photo */}
            <div className="space-y-2">
              <Label>Receipt Photo (Optional)</Label>
              {photoUrl ? (
                <div className="relative">
                  <img
                    src={photoUrl}
                    alt="Receipt"
                    className="w-full h-48 object-cover rounded-xl border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    disabled={isSubmitting}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full h-32 border-2 border-dashed rounded-xl",
                    "flex flex-col items-center justify-center gap-2",
                    "hover:border-primary hover:bg-primary/5 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to add receipt photo</span>
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                className="min-h-[80px] resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border sticky bottom-0 bg-background">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onCapture={handlePhotoCapture}
      />
    </>
  );
}

