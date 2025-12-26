import { useState } from 'react';
import { Search, Users, Plus, CreditCard, Send, CheckSquare, Square, Loader2, X, Download, Upload, Mail, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { ReferralSMSModal } from '@/components/ReferralSMSModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadCustomersForXero } from '@/utils/exportCSV';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';

type DDFilter = 'all' | 'with-dd' | 'without-dd' | 'pending';

const Customers = () => {
  const { customers, businessName, profile, isLoading, addCustomer, updateCustomer, archiveCustomer, refetchAll } = useSupabaseData();
  const { requirePremium } = useSoftPaywall();
  const { showTemplatePicker } = useSMSTemplateContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [ddFilter, setDDFilter] = useState<DDFilter>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBulkDD, setIsSendingBulkDD] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  const isGoCardlessConnected = !!profile?.gocardless_organisation_id;

  // Calculate counts for each filter (before applying DD filter, but after search)
  const searchFilteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ddCounts = {
    all: searchFilteredCustomers.length,
    withDD: searchFilteredCustomers.filter(c => !!c.gocardless_id).length,
    withoutDD: searchFilteredCustomers.filter(c => !c.gocardless_id && c.gocardless_mandate_status !== 'pending').length,
    pending: searchFilteredCustomers.filter(c => c.gocardless_mandate_status === 'pending').length,
  };

  const filteredCustomers = searchFilteredCustomers.filter(customer => {
    // DD filter
    if (ddFilter === 'with-dd') {
      return !!customer.gocardless_id;
    } else if (ddFilter === 'without-dd') {
      return !customer.gocardless_id && customer.gocardless_mandate_status !== 'pending';
    } else if (ddFilter === 'pending') {
      return customer.gocardless_mandate_status === 'pending';
    }
    return true;
  });

  // Customers eligible for DD link (no mandate, has phone)
  const customersEligibleForDD = filteredCustomers.filter(
    c => !c.gocardless_id && c.gocardless_mandate_status !== 'pending' && c.mobile_phone
  );

  const toggleSelectCustomer = (customerId: string) => {
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

  const selectAllEligible = () => {
    setSelectedIds(new Set(customersEligibleForDD.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkSendDDLink = async () => {
    const selectedCustomers = customersEligibleForDD.filter(c => selectedIds.has(c.id));
    if (selectedCustomers.length === 0) {
      toast.error('No customers selected');
      return;
    }

    // For bulk operations, we'll process each customer individually with template picker
    // This ensures each customer gets a personalized message
    setIsSendingBulkDD(true);
    let processedCount = 0;
    const totalCustomers = selectedCustomers.length;

    const processNextCustomer = async (index: number) => {
      if (index >= selectedCustomers.length) {
        setIsSendingBulkDD(false);
        clearSelection();
        refetchAll();
        toast.success(`Processed ${processedCount} customer${processedCount !== 1 ? 's' : ''}`);
        return;
      }

      const customer = selectedCustomers[index];
      
      try {
        const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
          body: { customerId: customer.id }
        });

        if (error) throw error;
        if (!data?.authorisationUrl) throw new Error('No authorization URL returned');

        if (!customer.mobile_phone) {
          console.warn(`Customer ${customer.name} has no phone number, skipping`);
          processNextCustomer(index + 1);
          return;
        }

        const context = prepareSMSContext({
          customerName: customer.name,
          ddLink: data.authorisationUrl,
          businessName,
        });

        // Show template picker for this customer
        showTemplatePicker('dd_bulk_invite', context, (message) => {
          openSMSApp(customer.mobile_phone, message);
          processedCount++;
          // Process next customer after a short delay to allow SMS app to open
          setTimeout(() => processNextCustomer(index + 1), 500);
        });
      } catch (error) {
        console.error(`Failed to generate DD link for ${customer.name}:`, error);
        toast.error(`Failed for ${customer.name}`);
        // Continue with next customer even if this one failed
        processNextCustomer(index + 1);
      }
    };

    // Start processing from the first customer
    processNextCustomer(0);
  };

  const handleEditCustomer = (customer: Customer) => {
    if (!requirePremium('edit')) return;
    setSelectedCustomer(null);
    setEditingCustomer(customer);
  };

  const handleArchiveCustomer = async (customerId: string) => {
    if (!requirePremium('edit')) return;
    
    try {
      await archiveCustomer(customerId);
      
      // Close the modal after successful archive
      setTimeout(() => {
        setSelectedCustomer(null);
      }, 200);
    } catch (error) {
      console.error('[Customers] Error archiving customer:', error);
      // Error toast is already shown by archiveCustomer function
      // Modal stays open so user can see the error and try again if needed
    }
  };

  const handleViewHistory = (customer: Customer) => {
    // Close detail modal first, then open history modal after a brief delay
    // This ensures proper modal transition and prevents z-index conflicts
    setSelectedCustomer(null);
    // Small delay to allow detail modal to start closing animation
    setTimeout(() => {
      setHistoryCustomer(customer);
    }, 150);
  };

  const handleAddClick = () => {
    if (!requirePremium('add-customer')) return;
    setIsAddModalOpen(true);
  };

  const handleExportToXero = () => {
    try {
      // Export only active customers
      const activeCustomers = filteredCustomers.filter(c => c.status === 'active');
      
      if (activeCustomers.length === 0) {
        toast.error('No customers to export');
        return;
      }

      downloadCustomersForXero(activeCustomers, businessName);
      
      toast.success(`Exported ${activeCustomers.length} customer${activeCustomers.length !== 1 ? 's' : ''} to Xero CSV`, {
        description: 'File downloaded successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export customers', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Customers" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState type="skeleton" skeletonType="customer-card" skeletonCount={5} />
        ) : customers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyState
              title="No customers yet"
              description="Add your first customer to get started"
              icon={<Users className="w-8 h-8 text-primary" />}
            />
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={handleAddClick}
              className={cn(
                "w-full mt-6 h-14 rounded-xl",
                "bg-primary text-primary-foreground",
                "font-semibold text-base",
                "flex items-center justify-center gap-2",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              <Plus className="w-5 h-5" />
              Add Your First Customer
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Search - Enhanced Fintech Style */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full h-12 pl-12 pr-4 rounded-xl touch-sm",
                    "bg-card border border-border shadow-sm",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                    "transition-all duration-200",
                    "dark:bg-card dark:border-border"
                  )}
                />
              </div>
            </motion.div>

            {/* DD Filter - only show if GoCardless connected - Optimized for mobile */}
            {isGoCardlessConnected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
              >
                <button
                  onClick={() => setDDFilter('all')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    ddFilter === 'all'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  All
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    ddFilter === 'all' ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {ddCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setDDFilter('with-dd')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    ddFilter === 'with-dd'
                      ? "bg-success text-success-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  DD
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    ddFilter === 'with-dd' ? "bg-success-foreground/20" : "bg-background"
                  )}>
                    {ddCounts.withDD}
                  </span>
                </button>
                <button
                  onClick={() => setDDFilter('without-dd')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    ddFilter === 'without-dd'
                      ? "bg-muted-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  No DD
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    ddFilter === 'without-dd' ? "bg-background/20" : "bg-background"
                  )}>
                    {ddCounts.withoutDD}
                  </span>
                </button>
                {ddCounts.pending > 0 && (
                  <button
                    onClick={() => setDDFilter('pending')}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                      ddFilter === 'pending'
                        ? "bg-warning text-warning-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                    )}
                  >
                    Pending
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                      ddFilter === 'pending' ? "bg-warning-foreground/20" : "bg-background"
                    )}>
                      {ddCounts.pending}
                    </span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Customer count and actions - Optimized for mobile */}
            <div className="mb-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-medium">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}</span>
              </div>
              
              {/* Action buttons - Stack on mobile for better touch targets */}
              {!selectMode && filteredCustomers.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Export to Xero button */}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleExportToXero}
                    className="flex-1 h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export for Xero
                  </Button>
                  
                  {/* Bulk DD Link action - only show if GoCardless connected and eligible customers exist */}
                  {isGoCardlessConnected && customersEligibleForDD.length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setSelectMode(true)}
                      className="flex-1 h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Bulk DD Link
                    </Button>
                  )}

                  {/* Friends & Family Referral */}
                  {customers.filter(c => c.mobile_phone).length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setIsReferralModalOpen(true)}
                      className="flex-1 h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Referral SMS
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Select mode header */}
            <AnimatePresence>
              {selectMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {selectedIds.size} of {customersEligibleForDD.length} selected
                    </span>
                    <button
                      onClick={clearSelection}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllEligible}
                      className="flex-1"
                    >
                      Select All ({customersEligibleForDD.length})
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkSendDDLink}
                      disabled={selectedIds.size === 0 || isSendingBulkDD}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      {isSendingBulkDD ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-1.5" />
                      )}
                      Send DD Links
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Customer list */}
            <div className="space-y-4">
              {filteredCustomers.map((customer, index) => {
                const isEligible = customersEligibleForDD.some(c => c.id === customer.id);
                const isSelected = selectedIds.has(customer.id);
                
                return (
                  <div key={customer.id} className="flex items-center gap-3 min-h-[88px] overflow-hidden">
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <button
                        onClick={() => isEligible && toggleSelectCustomer(customer.id)}
                        disabled={!isEligible}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          !isEligible && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-6 h-6 text-primary" />
                        ) : (
                          <Square className="w-6 h-6 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 h-full min-w-0 overflow-hidden">
                      <CustomerCard
                        customer={customer}
                        onClick={() => !selectMode && setSelectedCustomer(customer)}
                        index={index}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Import Help CTA - only show when there are customers - Optimized for mobile */}
            {!selectMode && filteredCustomers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1.5">
                      Moving from another app?
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300/80 mb-4">
                      Don't type them in manually! We can import your customers for you.
                    </p>
                    <a
                      href="mailto:aaron@solowipe.co.uk?subject=Help me import my customers"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 active:bg-blue-300 dark:active:bg-blue-900/80 rounded-lg transition-colors touch-sm w-full sm:w-auto"
                    >
                      <Mail className="w-4 h-4" />
                      Get Import Help
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty search state */}
            {filteredCustomers.length === 0 && searchQuery && (
              <EmptyState
                title="No customers found"
                description="Try a different search term"
                icon={<Users className="w-8 h-8 text-primary" />}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      {!isLoading && customers.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddClick}
          className={cn(
            "fixed right-4 bottom-24 z-40",
            "w-14 h-14 rounded-full",
            "bg-primary text-primary-foreground",
            "flex items-center justify-center",
            "shadow-lg hover:bg-primary/90 transition-colors"
          )}
          aria-label="Add customer"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          businessName={businessName || profile?.business_name || 'My Window Cleaning'}
          profile={profile}
          onClose={() => setSelectedCustomer(null)}
          onEdit={handleEditCustomer}
          onArchive={handleArchiveCustomer}
          onViewHistory={handleViewHistory}
          onRefresh={refetchAll}
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={addCustomer}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={editingCustomer}
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSubmit={updateCustomer}
      />

      {/* Customer History Modal */}
      <CustomerHistoryModal
        customer={historyCustomer}
        isOpen={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />

      {/* Referral SMS Modal */}
      <ReferralSMSModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        customers={customers}
        businessName={businessName || 'Your Business'}
      />
    </div>
  );
};

export default Customers;
