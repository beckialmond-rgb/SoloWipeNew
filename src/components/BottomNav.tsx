import { Home, Users, Wallet, TrendingUp, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const { user } = useAuth();

  const { data: unpaidCount = 0 } = useQuery({
    queryKey: ['unpaidCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid');
      
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navItems = [
    { to: '/', icon: Home, label: 'Today', badge: 0 },
    { to: '/customers', icon: Users, label: 'Customers', badge: 0 },
    { to: '/money', icon: Wallet, label: 'Money', badge: unpaidCount },
    { to: '/earnings', icon: TrendingUp, label: 'Earnings', badge: 0 },
    { to: '/settings', icon: Settings, label: 'Settings', badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
              "text-muted-foreground hover:text-primary"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-amber-500 rounded-full px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}