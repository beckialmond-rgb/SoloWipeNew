import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, CalendarPlus, User, CalendarCheck } from 'lucide-react';
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
  bookedCustomerIds: string[];
}

export const QuickScheduleModal = ({
  open,
  onOpenChange,
  selectedDate,
  customers,
  bookedCustomerIds
}: QuickScheduleModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const filteredCustomers = useMemo(() => {
    const filtered = !searchQuery.trim() 
      ? customers 
      : customers.filter(
          c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               c.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
    
    // Sort: available customers first, then booked
    return filtered.sort((a, b) => {
      const aBooked = bookedCustomerIds.includes(a.id);
      const bBooked = bookedCustomerIds.includes(b.id);
      if (aBooked === bBooked) return 0;
      return aBooked ? 1 : -1;
    });
  }, [customers, searchQuery, bookedCustomerIds]);

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
              filteredCustomers.map(customer => {
                const isBooked = bookedCustomerIds.includes(customer.id);
                
                return (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className={cn(
                      "w-full justify-start h-auto py-3 px-4",
                      isScheduling && "opacity-50 pointer-events-none",
                      isBooked && "opacity-60 bg-muted/50"
                    )}
                    onClick={() => handleSchedule(customer)}
                    disabled={isScheduling || isBooked}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{customer.name}</p>
                        {isBooked && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <CalendarCheck className="w-3 h-3" />
                            Booked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                    </div>
                    <span className={cn(
                      "font-semibold",
                      isBooked ? "text-muted-foreground" : "text-primary"
                    )}>£{customer.price}</span>
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
