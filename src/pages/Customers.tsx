import { useState, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Users, Plus, CreditCard, Send, CheckSquare, Square, Loader2, X, Download, Upload, Mail, Gift, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { ReferralSMSModal } from '@/components/ReferralSMSModal';
import { ImportCustomersModal } from '@/components/ImportCustomersModal';
import { BulkDDSendModal, BulkDDSendResult } from '@/components/BulkDDSendModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useRole } from '@/hooks/useRole';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadCustomersForXero } from '@/utils/exportCSV';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';
import { useSMSTemplates } from '@/hooks/useSMSTemplates';
import { replaceTemplateVariables, getDefaultTemplateId, getTemplateById } from '@/utils/smsTemplateUtils';

type DDFilter = 'all' | 'with-dd' | 'without-dd' | 'pending';

const Customers = () => {
  const { customers, businessName, profile, isLoading, addCustomer, updateCustomer, archiveCustomer, refetchAll } = useSupabaseData();
  const { isOwner, isHelper, isLoading: roleLoading } = useRole();
  const { requirePremium } = useSoftPaywall();
  const { showTemplatePicker } = useSMSTemplateContext();
  const { templates } = useSMSTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [ddFilter, setDDFilter] = useState<DDFilter>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [bulkMode, setBulkMode] = useState<'dd-links' | 'payment-method'>('dd-links');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBulkDD, setIsSendingBulkDD] = useState(false);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<'cash' | 'transfer' | 'gocardless' | null>(null);
  const [isUpdatingPaymentMethods, setIsUpdatingPaymentMethods] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Bulk DD send modal state
  const [isBulkDDSendModalOpen, setIsBulkDDSendModalOpen] = useState(false);
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(false);
  const [bulkDDSendProgress, setBulkDDSendProgress] = useState({ current: 0, total: 0 });
  const [bulkDDSendResults, setBulkDDSendResults] = useState<BulkDDSendResult[]>([]);
  const [isBulkDDSending, setIsBulkDDSending] = useState(false);
  const [bulkDDSendCancelled, setBulkDDSendCancelled] = useState(false);

  const isGoCardlessConnected = !!profile?.gocardless_organisation_id;

  // Debounce search query to avoid filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Calculate counts for each filter (before applying DD filter, but after search)
  const searchFilteredCustomers = useMemo(() => {
    if (!debouncedSearchQuery) {
      return customers;
    }
    const query = debouncedSearchQuery.toLowerCase().replace(/\s/g, ''); // Strip spaces from search query
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      customer.address.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (customer.mobile_phone && customer.mobile_phone.replace(/\s/g, '').toLowerCase().includes(query))
    );
  }, [customers, debouncedSearchQuery]);

  const ddCounts = useMemo(() => {
    return {
      all: searchFilteredCustomers.length,
      withDD: searchFilteredCustomers.filter(c => !!c.gocardless_id).length,
      withoutDD: searchFilteredCustomers.filter(c => !c.gocardless_id && c.gocardless_mandate_status !== 'pending').length,
      pending: searchFilteredCustomers.filter(c => c.gocardless_mandate_status === 'pending').length,
    };
  }, [searchFilteredCustomers]);

  const filteredCustomers = useMemo(() => {
    return searchFilteredCustomers.filter(customer => {
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
  }, [searchFilteredCustomers, ddFilter]);

  // Customers eligible for DD link (no mandate, has phone)
  const customersEligibleForDD = useMemo(() => {
    return filteredCustomers.filter(
      c => !c.gocardless_id && c.gocardless_mandate_status !== 'pending' && c.mobile_phone
    );
  }, [filteredCustomers]);

  // Virtualization setup for customer list
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredCustomers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 112, // CustomerCard height (~88px) + gap (24px)
    overscan: 5, // Render 5 extra items outside viewport
  });

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
    if (bulkMode === 'dd-links') {
      setSelectedIds(new Set(customersEligibleForDD.map(c => c.id)));
    } else {
      // For payment method, select all filtered customers
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkPaymentMethod(null);
  };

  // Get eligible customers based on current bulk mode
  const eligibleCustomersForBulkMode = useMemo(() => {
    if (bulkMode === 'dd-links') {
      return customersEligibleForDD;
    } else {
      return filteredCustomers; // All customers for payment method
    }
  }, [bulkMode, customersEligibleForDD, filteredCustomers]);

  const handleBulkSendDDLink = () => {
    const selectedCustomers = customersEligibleForDD.filter(c => selectedIds.has(c.id));
    if (selectedCustomers.length === 0) {
      toast.error('No customers selected');
      return;
    }

    // Reset state and open modal
    setBulkDDSendResults([]);
    setBulkDDSendProgress({ current: 0, total: selectedCustomers.length });
    setUseDefaultTemplate(false);
    setBulkDDSendCancelled(false);
    setIsBulkDDSendModalOpen(true);
  };

  const handleStartBulkDDSend = async () => {
    const selectedCustomers = customersEligibleForDD.filter(c => selectedIds.has(c.id));
    if (selectedCustomers.length === 0) {
      toast.error('No customers selected');
      setIsBulkDDSendModalOpen(false);
      return;
    }

    setIsBulkDDSending(true);
    setIsSendingBulkDD(true);
    setBulkDDSendCancelled(false);
    setBulkDDSendResults([]);
    setBulkDDSendProgress({ current: 0, total: selectedCustomers.length });

    const results: BulkDDSendResult[] = [];

    const addResult = (result: BulkDDSendResult) => {
      results.push(result);
      setBulkDDSendResults([...results]);
    };

    const processNextCustomer = async (index: number) => {
      // Check if cancelled
      if (bulkDDSendCancelled) {
        setIsBulkDDSending(false);
        setIsSendingBulkDD(false);
        return;
      }

      if (index >= selectedCustomers.length) {
        // All customers processed
        setIsBulkDDSending(false);
        setIsSendingBulkDD(false);
        clearSelection();
        refetchAll();
        return;
      }

      const customer = selectedCustomers[index];
      setBulkDDSendProgress({ current: index + 1, total: selectedCustomers.length });

      try {
        // Check if customer has phone number
        if (!customer.mobile_phone) {
          addResult({
            customerId: customer.id,
            customerName: customer.name,
            success: false,
            error: 'No phone number',
          });
          processNextCustomer(index + 1);
          return;
        }

        // Create mandate link
        const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
          body: { 
            customerId: customer.id,
            customerName: customer.name, // FIX: Add customerName
          }
        });

        if (error) throw error;
        if (!data?.authorisationUrl) throw new Error('No authorization URL returned');

        const context = prepareSMSContext({
          customerName: customer.name,
          ddLink: data.authorisationUrl,
          businessName,
        });

        // Handle template selection
        if (useDefaultTemplate) {
          // Use default template without picker
          try {
            const categoryConfig = templates['direct_debit_invite'];
            const defaultTemplateId = categoryConfig?.defaultTemplateId || getDefaultTemplateId('direct_debit_invite');
            const defaultTemplate = getTemplateById('direct_debit_invite', defaultTemplateId);
            
            if (!defaultTemplate || !defaultTemplate.message) {
              throw new Error('Default template not found');
            }

            const message = replaceTemplateVariables(defaultTemplate.message, context);
            openSMSApp(customer.mobile_phone, message);
            
            addResult({
              customerId: customer.id,
              customerName: customer.name,
              success: true,
            });
          } catch (templateError) {
            console.error(`Failed to use default template for ${customer.name}:`, templateError);
            addResult({
              customerId: customer.id,
              customerName: customer.name,
              success: false,
              error: 'Template error',
            });
          }
          
          // Process next customer after a short delay to allow SMS app to open
          setTimeout(() => processNextCustomer(index + 1), 500);
        } else {
          // Show template picker - need to capture index in closure
          const currentIndex = index;
          showTemplatePicker('dd_bulk_invite', context, (message) => {
            openSMSApp(customer.mobile_phone, message);
            addResult({
              customerId: customer.id,
              customerName: customer.name,
              success: true,
            });
            // Process next customer after a short delay to allow SMS app to open
            setTimeout(() => processNextCustomer(currentIndex + 1), 500);
          });
          // Don't call processNextCustomer here - it will be called from the picker callback
          return;
        }
      } catch (error) {
        console.error(`Failed to generate DD link for ${customer.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addResult({
          customerId: customer.id,
          customerName: customer.name,
          success: false,
          error: errorMessage,
        });
        // Continue with next customer even if this one failed
        processNextCustomer(index + 1);
      }
    };

    // Start processing from the first customer
    processNextCustomer(0);
  };

  const handleCancelBulkDDSend = () => {
    setBulkDDSendCancelled(true);
    setIsBulkDDSending(false);
    setIsSendingBulkDD(false);
  };

  const handleCloseBulkDDSendModal = () => {
    if (isBulkDDSending && bulkDDSendResults.length < bulkDDSendProgress.total) {
      // Still sending - ask for confirmation
      if (window.confirm('Bulk send is in progress. Are you sure you want to cancel?')) {
        handleCancelBulkDDSend();
        setIsBulkDDSendModalOpen(false);
      }
    } else {
      setIsBulkDDSendModalOpen(false);
    }
  };

  const handleBulkUpdatePaymentMethod = async () => {
    if (!bulkPaymentMethod || selectedIds.size === 0) {
      toast.error('Please select a payment method and customers');
      return;
    }

    const selectedCustomers = filteredCustomers.filter(c => selectedIds.has(c.id));
    if (selectedCustomers.length === 0) {
      toast.error('No customers selected');
      return;
    }

    setIsUpdatingPaymentMethods(true);

    try {
      // Update each customer's preferred_payment_method
      const updatePromises = selectedCustomers.map(customer =>
        updateCustomer(customer.id, {
          name: customer.name,
          address: customer.address,
          mobile_phone: customer.mobile_phone,
          price: customer.price,
          frequency_weeks: customer.frequency_weeks,
          preferred_payment_method: bulkPaymentMethod,
        })
      );

      await Promise.all(updatePromises);

      toast.success(`Updated payment method to ${bulkPaymentMethod === 'gocardless' ? 'Direct Debit' : bulkPaymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'} for ${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''}`);
      clearSelection();
      refetchAll();
    } catch (error) {
      console.error('[Customers] Failed to update payment methods:', error);
      toast.error('Failed to update payment methods. Please try again.');
    } finally {
      setIsUpdatingPaymentMethods(false);
    }
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

  // Helper-only restriction: Helpers cannot access customer management
  if (!isLoading && !roleLoading && isHelper && !isOwner) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header showLogo={false} title="Customers" />
        <main className="px-4 py-6 max-w-lg mx-auto">
          <EmptyState
            icon={<Users className="w-12 h-12 text-muted-foreground" />}
            title="Helper Access"
            description="This page is only available to business owners. As a helper, you can view customer details for your assigned jobs from the dashboard."
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Customers" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading || roleLoading ? (
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
            <div className="flex flex-col gap-3 mt-6">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={handleAddClick}
                className={cn(
                  "w-full h-14 rounded-xl",
                  "bg-primary text-primary-foreground",
                  "font-semibold text-base",
                  "flex items-center justify-center gap-2",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                <Plus className="w-5 h-5" />
                Add Your First Customer
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => setIsImportModalOpen(true)}
                className={cn(
                  "w-full h-14 rounded-xl",
                  "bg-background border-2 border-border",
                  "font-semibold text-base text-foreground",
                  "flex items-center justify-center gap-2",
                  "hover:bg-muted/50 hover:border-primary/40",
                  "hover:shadow-depth-2 hover:-translate-y-0.5",
                  "transition-all duration-300 ease-out",
                  "shadow-sm"
                )}
              >
                <Upload className="w-5 h-5" />
                Import from CSV
              </motion.button>
            </div>
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
                className="flex flex-col sm:flex-row gap-2 mb-4"
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
              
              {/* Action buttons - Grid layout for stable positioning */}
              {!selectMode && filteredCustomers.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Import CSV button */}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium min-w-0"
                  >
                    <Upload className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Import CSV</span>
                  </Button>
                  {/* Export to Xero button */}
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleExportToXero}
                    className="h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium min-w-0"
                  >
                    <Download className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Export for Xero</span>
                  </Button>
                  
                  {/* Bulk Operations button - only show if GoCardless connected */}
                  {isGoCardlessConnected && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => {
                        setSelectMode(true);
                        setBulkMode('dd-links');
                      }}
                      className="h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium min-w-0"
                    >
                      <Send className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">Bulk Actions</span>
                    </Button>
                  )}

                  {/* Friends & Family Referral */}
                  {customers.filter(c => c.mobile_phone).length > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setIsReferralModalOpen(true)}
                      className="h-11 text-primary border-primary/20 hover:bg-primary/10 touch-sm font-medium min-w-0"
                    >
                      <Gift className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">Referral SMS</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Bulk Operations - Tabbed Interface */}
            <AnimatePresence>
              {selectMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 bg-card rounded-xl border border-border shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-foreground">
                      {selectedIds.size} of {eligibleCustomersForBulkMode.length} selected
                    </span>
                    <button
                      onClick={clearSelection}
                      className="p-1 hover:bg-muted rounded-full transition-colors touch-sm min-h-[32px] min-w-[32px] flex items-center justify-center"
                      aria-label="Close bulk operations"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <Tabs value={bulkMode} onValueChange={(value) => {
                    setBulkMode(value as 'dd-links' | 'payment-method');
                    // Clear selection when switching tabs
                    setSelectedIds(new Set());
                    setBulkPaymentMethod(null);
                  }}>
                    <TabsList className="w-full grid grid-cols-2 h-12 mb-4">
                      <TabsTrigger value="dd-links" className="flex items-center gap-2 text-sm">
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Bulk DD Links</span>
                        <span className="sm:hidden">DD Links</span>
                      </TabsTrigger>
                      <TabsTrigger value="payment-method" className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">Payment Method</span>
                        <span className="sm:hidden">Payment</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dd-links" className="mt-0 space-y-3">
                      {customersEligibleForDD.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No customers eligible for Direct Debit setup
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllEligible}
                              className="flex-1 touch-sm min-h-[44px]"
                            >
                              Select All ({customersEligibleForDD.length})
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleBulkSendDDLink}
                              disabled={selectedIds.size === 0 || isSendingBulkDD}
                              className="flex-1 bg-primary hover:bg-primary/90 touch-sm min-h-[44px]"
                            >
                              <Send className="w-4 h-4 mr-1.5" />
                              Send DD Links
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select customers without Direct Debit to send setup links
                          </p>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="payment-method" className="mt-0 space-y-4">
                      {/* Payment Method Selection */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">Select Payment Method</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setBulkPaymentMethod('cash')}
                            disabled={isUpdatingPaymentMethods}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all touch-sm min-h-[80px]",
                              "hover:border-primary hover:bg-primary/5",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              bulkPaymentMethod === 'cash'
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            )}
                          >
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-medium text-foreground text-sm">Cash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBulkPaymentMethod('transfer')}
                            disabled={isUpdatingPaymentMethods}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all touch-sm min-h-[80px]",
                              "hover:border-primary hover:bg-primary/5",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              bulkPaymentMethod === 'transfer'
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            )}
                          >
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-foreground text-sm">Bank Transfer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBulkPaymentMethod('gocardless')}
                            disabled={isUpdatingPaymentMethods}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all touch-sm min-h-[80px]",
                              "hover:border-primary hover:bg-primary/5",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              bulkPaymentMethod === 'gocardless'
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            )}
                          >
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-medium text-foreground text-sm">Direct Debit</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllEligible}
                          className="flex-1 touch-sm min-h-[44px]"
                        >
                          Select All ({filteredCustomers.length})
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleBulkUpdatePaymentMethod}
                          disabled={selectedIds.size === 0 || !bulkPaymentMethod || isUpdatingPaymentMethods}
                          className="flex-1 bg-primary hover:bg-primary/90 touch-sm min-h-[44px]"
                        >
                          {isUpdatingPaymentMethods ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-1.5" />
                              Update Payment Method
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select customers and choose their preferred payment method
                      </p>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Customer list - Virtualized */}
            <div 
              ref={parentRef}
              className="overflow-auto"
              style={{ 
                height: 'calc(100vh - 450px)',
                minHeight: '400px',
                maxHeight: '800px',
              }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const customer = filteredCustomers[virtualRow.index];
                  const isEligible = customersEligibleForDD.some(c => c.id === customer.id);
                  const isSelected = selectedIds.has(customer.id);
                  
                  return (
                    <div
                      key={customer.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-h-[88px] overflow-hidden pr-1 pb-4">
                        {/* Checkbox in select mode */}
                        {selectMode && (
                          <button
                            onClick={() => {
                              // For DD links mode, only allow eligible customers
                              // For payment method mode, allow all customers
                              if (bulkMode === 'dd-links' && !isEligible) return;
                              toggleSelectCustomer(customer.id);
                            }}
                            disabled={bulkMode === 'dd-links' && !isEligible}
                            className={cn(
                              "flex-shrink-0 transition-colors touch-sm min-h-[44px] min-w-[44px] flex items-center justify-center",
                              bulkMode === 'dd-links' && !isEligible && "opacity-30 cursor-not-allowed"
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
                            index={virtualRow.index}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* Import Customers Modal */}
      <ImportCustomersModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => {
          refetchAll();
        }}
        addCustomer={addCustomer}
      />

      {/* Bulk DD Send Modal */}
      <BulkDDSendModal
        isOpen={isBulkDDSendModalOpen}
        onClose={handleCloseBulkDDSendModal}
        customers={customersEligibleForDD.filter(c => selectedIds.has(c.id))}
        useDefaultTemplate={useDefaultTemplate}
        onToggleDefaultTemplate={setUseDefaultTemplate}
        onStart={handleStartBulkDDSend}
        isSending={isBulkDDSending}
        progress={bulkDDSendProgress}
        results={bulkDDSendResults}
        isComplete={isBulkDDSending === false && bulkDDSendResults.length > 0 && bulkDDSendResults.length === bulkDDSendProgress.total}
        onCancel={isBulkDDSending ? handleCancelBulkDDSend : undefined}
      />
    </div>
  );
};

export default Customers;
