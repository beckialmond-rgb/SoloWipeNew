import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Percent, AlertTriangle, CheckCircle2, MessageSquare, Loader2, TrendingUp, PoundSterling } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';

interface PriceIncreaseWizardProps {
  customers: Customer[];
  businessName: string;
  onUpdateComplete?: () => void;
}

interface CustomerPriceUpdate {
  customer: Customer;
  currentPrice: number;
  newPrice: number;
}

type IncreaseType = 'percentage' | 'flat';

export function PriceIncreaseWizard({ customers, businessName, onUpdateComplete }: PriceIncreaseWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { showTemplatePicker } = useSMSTemplateContext();
  
  const [increaseType, setIncreaseType] = useState<IncreaseType>('percentage');
  const [increaseValue, setIncreaseValue] = useState<string>('');
  const [roundingOption, setRoundingOption] = useState<'50p' | '1pound'>('50p');
  const [showReview, setShowReview] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());

  // Smart rounding function
  const roundPrice = (price: number, option: '50p' | '1pound'): number => {
    if (option === '50p') {
      return Math.round(price * 2) / 2; // Round to nearest 0.50
    } else {
      return Math.round(price); // Round to nearest 1.00
    }
  };

  // Calculate new prices for all customers
  const priceUpdates = useMemo<CustomerPriceUpdate[]>(() => {
    if (!increaseValue || parseFloat(increaseValue) <= 0) return [];

    const value = parseFloat(increaseValue);
    
    return customers.map(customer => {
      let newPrice: number;
      
      if (increaseType === 'percentage') {
        newPrice = customer.price * (1 + value / 100);
      } else {
        newPrice = customer.price + value;
      }
      
      // Ensure price doesn't go negative
      newPrice = Math.max(0, newPrice);
      
      // Apply smart rounding
      const roundedPrice = roundPrice(newPrice, roundingOption);
      
      return {
        customer,
        currentPrice: customer.price,
        newPrice: roundedPrice,
      };
    }).filter(update => update.newPrice !== update.currentPrice); // Only show customers with price changes
  }, [customers, increaseType, increaseValue, roundingOption]);

  const handleCalculate = () => {
    if (!increaseValue || parseFloat(increaseValue) <= 0) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a valid increase amount',
        variant: 'destructive',
      });
      return;
    }

    if (priceUpdates.length === 0) {
      toast({
        title: 'No changes',
        description: 'This increase would not change any customer prices',
        variant: 'destructive',
      });
      return;
    }

    setShowReview(true);
  };

  const updateCustomerPrice = async (customerId: string, newPrice: number) => {
    setUpdatingIds(prev => new Set(prev).add(customerId));

    try {
      const { error } = await supabase
        .from('customers')
        .update({ price: newPrice })
        .eq('id', customerId)
        .eq('profile_id', user?.id);

      if (error) throw error;

      setUpdatedIds(prev => new Set(prev).add(customerId));
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
      
      toast({
        title: 'Price updated',
        description: 'Customer price has been updated successfully',
      });

      onUpdateComplete?.();
    } catch (error) {
      console.error('Error updating customer price:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update customer price',
        variant: 'destructive',
      });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(customerId);
        return next;
      });
    }
  };

  const updateAllPrices = async () => {
    const updatesToApply = priceUpdates.filter(
      update => !updatedIds.has(update.customer.id)
    );

    if (updatesToApply.length === 0) {
      toast({
        title: 'Nothing to update',
        description: 'All prices have already been updated',
      });
      return;
    }

    setUpdatingIds(new Set(updatesToApply.map(u => u.customer.id)));

    try {
      const updates = updatesToApply.map(update => ({
        id: update.customer.id,
        price: update.newPrice,
      }));

      // Update all in parallel
      const promises = updates.map(update =>
        supabase
          .from('customers')
          .update({ price: update.price })
          .eq('id', update.id)
          .eq('profile_id', user?.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`${errors.length} updates failed`);
      }

      setUpdatedIds(prev => {
        const allUpdated = new Set(prev);
        updates.forEach(u => allUpdated.add(u.id));
        return allUpdated;
      });

      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });

      toast({
        title: 'Prices updated',
        description: `Successfully updated ${updates.length} customer prices`,
      });

      onUpdateComplete?.();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update some prices',
        variant: 'destructive',
      });
    } finally {
      setUpdatingIds(new Set());
    }
  };

  const sendPriceUpdateSMS = (customer: Customer, newPrice: number) => {
    if (!customer.mobile_phone) {
      toast({
        title: 'No phone number',
        description: 'This customer does not have a mobile number',
        variant: 'destructive',
      });
      return;
    }

    const context = prepareSMSContext({
      customerName: customer.name,
      price: newPrice,
      new_price: newPrice,
      current_price: customer.price,
      businessName,
    });

    showTemplatePicker('price_increase', context, (message) => {
      openSMSApp(customer.mobile_phone, message);
    });
  };

  if (showReview) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Review Price Changes</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowReview(false);
              setUpdatedIds(new Set());
            }}
          >
            Back
          </Button>
        </div>

        {/* Summary */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                {priceUpdates.length} customer{priceUpdates.length !== 1 ? 's' : ''} will be updated
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This will only update the default price. Historical payment records are not affected.
              </p>
            </div>
          </div>
        </div>

        {/* Update All Button */}
        {priceUpdates.some(u => !updatedIds.has(u.customer.id)) && (
          <Button
            onClick={updateAllPrices}
            disabled={updatingIds.size > 0}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {updatingIds.size > 0 ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Update All Prices
              </>
            )}
          </Button>
        )}

        {/* Customer List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {priceUpdates.map((update) => {
              const isUpdating = updatingIds.has(update.customer.id);
              const isUpdated = updatedIds.has(update.customer.id);
              const priceChange = update.newPrice - update.currentPrice;
              const priceChangePercent = ((priceChange / update.currentPrice) * 100).toFixed(1);

              return (
                <motion.div
                  key={update.customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "bg-card rounded-xl border-2 p-4",
                    isUpdated && "border-green-500 bg-green-50 dark:bg-green-950/20",
                    !isUpdated && "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{update.customer.name}</h4>
                      <p className="text-xs text-muted-foreground truncate mt-1">{update.customer.address}</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Current</p>
                          <p className="text-lg font-bold text-foreground">£{update.currentPrice.toFixed(2)}</p>
                        </div>
                        
                        <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        
                        <div>
                          <p className="text-xs text-muted-foreground">New Price</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                            £{update.newPrice.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="ml-auto">
                          <p className="text-xs text-muted-foreground">Change</p>
                          <p className={cn(
                            "text-sm font-semibold",
                            priceChange >= 0 ? "text-amber-700 dark:text-amber-300" : "text-red-600 dark:text-red-400"
                          )}>
                            {priceChange >= 0 ? '+' : ''}£{priceChange.toFixed(2)} ({priceChangePercent}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    {isUpdated ? (
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Updated
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={() => updateCustomerPrice(update.customer.id, update.newPrice)}
                          disabled={isUpdating}
                          size="sm"
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Update Customer
                            </>
                          )}
                        </Button>
                        
                        {update.customer.mobile_phone && (
                          <Button
                            onClick={() => sendPriceUpdateSMS(update.customer, update.newPrice)}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <TrendingUp className="w-5 h-5 text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Price Increase Wizard</h3>
          <p className="text-xs text-muted-foreground">Calculate and apply price increases to all customers</p>
        </div>
      </div>

      {/* Increase Type Selector */}
      <div className="flex gap-2">
        <Button
          variant={increaseType === 'percentage' ? 'default' : 'outline'}
          onClick={() => setIncreaseType('percentage')}
          className={cn(
            "flex-1",
            increaseType === 'percentage' && "bg-amber-600 hover:bg-amber-700 text-white"
          )}
        >
          <Percent className="w-4 h-4 mr-2" />
          Percentage
        </Button>
        <Button
          variant={increaseType === 'flat' ? 'default' : 'outline'}
          onClick={() => setIncreaseType('flat')}
          className={cn(
            "flex-1",
            increaseType === 'flat' && "bg-amber-600 hover:bg-amber-700 text-white"
          )}
        >
          <PoundSterling className="w-4 h-4 mr-2" />
          Flat Amount
        </Button>
      </div>

      {/* Input */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {increaseType === 'percentage' ? 'Percentage Increase (%)' : 'Flat Amount Increase (£)'}
        </label>
        <Input
          type="number"
          step={increaseType === 'percentage' ? '0.1' : '0.50'}
          min="0"
          value={increaseValue}
          onChange={(e) => setIncreaseValue(e.target.value)}
          placeholder={increaseType === 'percentage' ? 'e.g., 10' : 'e.g., 2.00'}
          className="text-lg"
        />
      </div>

      {/* Rounding Option */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Smart Rounding</label>
        <div className="flex gap-2">
          <Button
            variant={roundingOption === '50p' ? 'default' : 'outline'}
            onClick={() => setRoundingOption('50p')}
            className={cn(
              "flex-1",
              roundingOption === '50p' && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            Nearest 50p
          </Button>
          <Button
            variant={roundingOption === '1pound' ? 'default' : 'outline'}
            onClick={() => setRoundingOption('1pound')}
            className={cn(
              "flex-1",
              roundingOption === '1pound' && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            Nearest £1
          </Button>
        </div>
      </div>

      {/* Preview */}
      {priceUpdates.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                {priceUpdates.length} customer{priceUpdates.length !== 1 ? 's' : ''} will be affected
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Click "Calculate & Review" to see the proposed changes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        disabled={!increaseValue || parseFloat(increaseValue) <= 0 || priceUpdates.length === 0}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        size="lg"
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Calculate & Review
      </Button>
    </div>
  );
}

