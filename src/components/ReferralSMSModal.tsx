/**
 * Referral SMS Modal Component
 * 
 * Allows cleaner to select customers and send them referral SMS messages
 * that they can share with their friends and family
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, Gift, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';
import { useToast } from '@/hooks/use-toast';

interface ReferralSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  businessName: string;
}

export function ReferralSMSModal({
  isOpen,
  onClose,
  customers,
  businessName,
}: ReferralSMSModalProps) {
  const { showTemplatePicker } = useSMSTemplateContext();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  // Only customers with phone numbers can receive SMS
  const eligibleCustomers = useMemo(() => {
    return customers.filter(c => c.mobile_phone);
  }, [customers]);

  const toggleCustomer = (customerId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(eligibleCustomers.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const generateReferralCode = (customer: Customer) => {
    // Generate unique code per customer based on their name and business
    const customerInitials = customer.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
    const businessInitials = businessName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${customerInitials}${businessInitials}${randomNum}`.toUpperCase();
  };

  const handleSendReferralSMS = () => {
    const selectedCustomers = eligibleCustomers.filter(c => selectedIds.has(c.id));
    
    if (selectedCustomers.length === 0) {
      toast({
        title: 'No customers selected',
        description: 'Please select at least one customer to send referral SMS to.',
        variant: 'destructive',
      });
      return;
    }

    // Generate referral code for first customer (we'll use same template for all)
    const firstCustomer = selectedCustomers[0];
    const referralCode = generateReferralCode(firstCustomer);
    
    // Prepare context with first customer's details for template preview
    const context = prepareSMSContext({
      customerName: firstCustomer.name,
      businessName: businessName,
      referral_code: referralCode,
    });

    // Show template picker - once selected, send to all selected customers
    showTemplatePicker('referral_sms', context, (messageTemplate) => {
      setIsSending(true);
      let sentCount = 0;
      let openedCount = 0;

      // Send SMS to each selected customer with their personalized message
      selectedCustomers.forEach((customer, index) => {
        const customerReferralCode = generateReferralCode(customer);
        
        // Personalize message for each customer
        const personalizedMessage = messageTemplate
          .replace(/{{customer_name}}/g, customer.name)
          .replace(/{{customer_firstName}}/g, customer.name.split(' ')[0] || customer.name)
          .replace(/{{referral_code}}/g, customerReferralCode)
          .replace(/{{business_name}}/g, businessName);

        setTimeout(() => {
          if (customer.mobile_phone) {
            openSMSApp(customer.mobile_phone, personalizedMessage);
            openedCount++;
            sentCount++;
            
            if (sentCount === selectedCustomers.length) {
              setIsSending(false);
              toast({
                title: 'Referral SMS sent!',
                description: `Opened ${openedCount} SMS message${openedCount !== 1 ? 's' : ''} for selected customers.`,
                duration: 4000,
              });
              onClose();
              setSelectedIds(new Set());
            }
          }
        }, index * 300); // Stagger SMS app openings
      });
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Friends & Family Referral</h2>
                <p className="text-xs text-muted-foreground">
                  Select customers to send referral SMS
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground">
                Send your customers a referral code they can share with their friends and family. 
                Their friends and family will get their first clean FREE!
              </p>
            </div>

            {/* Selection controls */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} of {eligibleCustomers.length} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedIds.size === eligibleCustomers.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Customer list */}
            <div className="space-y-2">
              {eligibleCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No customers with phone numbers</p>
                  <p className="text-xs mt-1">Add phone numbers to send referral SMS</p>
                </div>
              ) : (
                eligibleCustomers.map((customer) => {
                  const isSelected = selectedIds.has(customer.id);
                  return (
                    <button
                      key={customer.id}
                      onClick={() => toggleCustomer(customer.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                        isSelected
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card border-border hover:bg-muted/50"
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{customer.name}</p>
                        {customer.mobile_phone && (
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.mobile_phone}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <Button
              onClick={handleSendReferralSMS}
              disabled={selectedIds.size === 0 || isSending}
              className="w-full gap-2"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Send to {selectedIds.size} Customer{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

