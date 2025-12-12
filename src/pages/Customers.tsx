import { useState } from 'react';
import { Search, Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';

const Customers = () => {
  const { customers, businessName, isLoading, addCustomer, updateCustomer, archiveCustomer } = useSupabaseData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(null);
    setEditingCustomer(customer);
  };

  const handleArchiveCustomer = async (customerId: string) => {
    await archiveCustomer(customerId);
    setSelectedCustomer(null);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(null);
    setHistoryCustomer(customer);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Customers" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading customers..." />
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
              onClick={() => setIsAddModalOpen(true)}
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
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>
            </motion.div>

            {/* Customer count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Users className="w-4 h-4" />
              <span>{filteredCustomers.length} customers</span>
            </div>

            {/* Customer list */}
            <div className="space-y-3">
              {filteredCustomers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                  index={index}
                />
              ))}
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
          onClick={() => setIsAddModalOpen(true)}
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

      <BottomNav />

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          businessName={businessName}
          onClose={() => setSelectedCustomer(null)}
          onEdit={handleEditCustomer}
          onArchive={handleArchiveCustomer}
          onViewHistory={handleViewHistory}
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
