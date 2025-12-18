import { useState } from 'react';
import { Search, Users, Plus, CreditCard, Send, CheckSquare, Square, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DDFilter = 'all' | 'with-dd' | 'without-dd' | 'pending';

const Customers = () => {
  const { customers, businessName, profile, isLoading, addCustomer, updateCustomer, archiveCustomer, refetchAll } = useSupabaseData();
  const { requirePremium } = useSoftPaywall();
  const [searchQuery, setSearchQuery] = useState('');
  const [ddFilter, setDDFilter] = useState<DDFilter>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBulkDD, setIsSendingBulkDD] = useState(false);

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

    setIsSendingBulkDD(true);
    let successCount = 0;
    let failCount = 0;

    for (const customer of selectedCustomers) {
      try {
        const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
          body: { customerId: customer.id }
        });

        if (error) throw error;
        if (!data?.authorisationUrl) throw new Error('No authorization URL returned');

        const firstName = customer.name.split(' ')[0];
        const message = encodeURIComponent(
          `Hi ${firstName}, please set up your Direct Debit for ${businessName} using this secure link: ${data.authorisationUrl}`
        );
        const phone = customer.mobile_phone?.replace(/\s/g, '') || '';
        
        // Open SMS for each customer (will open multiple SMS apps)
        window.open(`sms:${phone}?body=${message}`, '_blank');
        successCount++;
      } catch (error) {
        console.error(`Failed to generate DD link for ${customer.name}:`, error);
        failCount++;
      }
    }

    setIsSendingBulkDD(false);
    clearSelection();
    refetchAll();

    if (successCount > 0) {
      toast.success(`Opened SMS for ${successCount} customer${successCount !== 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed for ${failCount} customer${failCount !== 1 ? 's' : ''}`);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    if (!requirePremium('edit')) return;
    setSelectedCustomer(null);
    setEditingCustomer(customer);
  };

  const handleArchiveCustomer = async (customerId: string) => {
    if (!requirePremium('edit')) return;
    await archiveCustomer(customerId);
    setSelectedCustomer(null);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(null);
    setHistoryCustomer(customer);
  };

  const handleAddClick = () => {
    if (!requirePremium('add-customer')) return;
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Customers" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState type="skeleton" skeletonType="customer-card" count={5} />
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
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full h-12 pl-12 pr-4 rounded-xl",
                    "bg-muted border border-border",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </motion.div>

            {/* DD Filter - only show if GoCardless connected */}
            {isGoCardlessConnected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 mb-4 overflow-x-auto pb-1"
              >
                <button
                  onClick={() => setDDFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    ddFilter === 'all'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                    ddFilter === 'all' ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {ddCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setDDFilter('with-dd')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    ddFilter === 'with-dd'
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  DD
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                    ddFilter === 'with-dd' ? "bg-success-foreground/20" : "bg-background"
                  )}>
                    {ddCounts.withDD}
                  </span>
                </button>
                <button
                  onClick={() => setDDFilter('without-dd')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    ddFilter === 'without-dd'
                      ? "bg-muted-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  No DD
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                    ddFilter === 'without-dd' ? "bg-background/20" : "bg-background"
                  )}>
                    {ddCounts.withoutDD}
                  </span>
                </button>
                {ddCounts.pending > 0 && (
                  <button
                    onClick={() => setDDFilter('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                      ddFilter === 'pending'
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    Pending
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                      ddFilter === 'pending' ? "bg-warning-foreground/20" : "bg-background"
                    )}>
                      {ddCounts.pending}
                    </span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Customer count and bulk DD action */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}</span>
              </div>
              
              {/* Bulk DD Link action - only show if GoCardless connected and eligible customers exist */}
              {isGoCardlessConnected && customersEligibleForDD.length > 0 && !selectMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectMode(true)}
                  className="text-primary border-primary/20 hover:bg-primary/10"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Bulk DD Link
                </Button>
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
                  <div key={customer.id} className="flex items-center gap-3 h-[72px] overflow-hidden">
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
          businessName={businessName}
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
    </div>
  );
};

export default Customers;
