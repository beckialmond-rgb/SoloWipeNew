import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { EmptyState } from '@/components/EmptyState';
import { useDemoData } from '@/hooks/useDemoData';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';

const Customers = () => {
  const { customers, businessName } = useDemoData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Customers" />

      <main className="px-4 py-6 max-w-lg mx-auto">
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

        {/* Empty state */}
        {filteredCustomers.length === 0 && (
          <EmptyState
            title="No customers found"
            description={searchQuery ? "Try a different search term" : "Add your first customer to get started"}
            icon={<Users className="w-8 h-8 text-primary" />}
          />
        )}
      </main>

      <BottomNav />

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          businessName={businessName}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

export default Customers;
