import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, CalendarPlus, User } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  address: string;
  price: number;
}

interface QuickScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  customers: Customer[];
}

export const QuickScheduleModal = ({
  open,
  onOpenChange,
  selectedDate,
  customers
}: QuickScheduleModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleSchedule = async (customer: Customer) => {
    if (!user || isScheduling) return;
    
    setIsScheduling(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        customer_id: customer.id,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'pending',
        payment_status: 'unpaid'
      });

      if (error) throw error;

      toast.success(`Scheduled ${customer.name} for ${format(selectedDate, 'EEE, d MMM')}`);
      
      await queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      await queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
      
      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error scheduling job:', error);
      toast.error('Failed to schedule job');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Quick Schedule for {format(selectedDate, 'EEE, d MMM')}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoComplete="off"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No customers found</p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <Button
                  key={customer.id}
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-auto py-3 px-4",
                    isScheduling && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleSchedule(customer)}
                  disabled={isScheduling}
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                  </div>
                  <span className="text-primary font-semibold">£{customer.price}</span>
                </Button>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
