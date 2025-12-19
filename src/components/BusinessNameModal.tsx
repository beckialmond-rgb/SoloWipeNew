import { useState } from 'react';
import { Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BusinessNameModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function BusinessNameModal({ isOpen, onComplete }: BusinessNameModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim()) {
      toast({
        title: 'Business name required',
        description: 'Please enter your business name to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be signed in to update your business name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ business_name: businessName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      // Clear the flag
      sessionStorage.removeItem('needs_business_name');
      
      toast({
        title: 'Welcome to SoloWipe!',
        description: 'Your business name has been saved.',
      });
      
      onComplete();
    } catch (error) {
      console.error('Failed to update business name:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save business name. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">Welcome to SoloWipe!</DialogTitle>
          <DialogDescription>
            We need your business name to get started. You can change this later in Settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoFocus
              required
              className={cn(
                "w-full h-14 pl-12 pr-4 rounded-xl",
                "bg-muted border-0",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
          </div>

          {/* Submit Button - Sticky at bottom */}
          <div className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting || !businessName.trim()}
              className={cn(
                "w-full h-14 rounded-xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "font-semibold text-base",
                "disabled:opacity-50"
              )}
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
