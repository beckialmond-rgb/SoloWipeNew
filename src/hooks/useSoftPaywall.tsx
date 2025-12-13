import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SoftPaywallContextType {
  isModalOpen: boolean;
  triggerAction: string | null;
  openPaywall: (action?: string) => void;
  closePaywall: () => void;
  requireAuth: (action?: string) => boolean;
}

const SoftPaywallContext = createContext<SoftPaywallContextType | undefined>(undefined);

export function SoftPaywallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerAction, setTriggerAction] = useState<string | null>(null);

  const openPaywall = useCallback((action?: string) => {
    setTriggerAction(action || null);
    setIsModalOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setIsModalOpen(false);
    setTriggerAction(null);
  }, []);

  // Returns true if user is authenticated, false if paywall was triggered
  const requireAuth = useCallback((action?: string): boolean => {
    if (user) {
      return true;
    }
    openPaywall(action);
    return false;
  }, [user, openPaywall]);

  return (
    <SoftPaywallContext.Provider value={{ isModalOpen, triggerAction, openPaywall, closePaywall, requireAuth }}>
      {children}
    </SoftPaywallContext.Provider>
  );
}

export function useSoftPaywall() {
  const context = useContext(SoftPaywallContext);
  if (context === undefined) {
    throw new Error('useSoftPaywall must be used within a SoftPaywallProvider');
  }
  return context;
}
