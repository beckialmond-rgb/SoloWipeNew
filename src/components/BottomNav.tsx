import { Home, Users, Wallet, CalendarDays, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/contexts/OfflineContext';
import { format } from 'date-fns';

export function BottomNav() {
  const { user } = useAuth();
  const { pendingCount } = useOffline();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Count unpaid jobs with better error handling
  const { data: unpaidCount = 0 } = useQuery({
    queryKey: ['unpaidCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('payment_status', 'unpaid');
      
      if (error) {
        console.error('Failed to fetch unpaid count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 2,
    staleTime: 20000, // Keep data fresh for 20 seconds
  });

  // Count today's pending jobs with better error handling
  const { data: pendingTodayCount = 0 } = useQuery({
    queryKey: ['pendingTodayCount', user?.id, today],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('scheduled_date', today);
      
      if (error) {
        console.error('Failed to fetch pending today count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 2,
    staleTime: 20000, // Keep data fresh for 20 seconds
  });

  const navItems = [
    { to: '/', icon: Home, label: 'Today', badge: pendingTodayCount, badgeColor: 'bg-primary' },
    { to: '/customers', icon: Users, label: 'Customers', badge: 0, badgeColor: '' },
    { to: '/money', icon: Wallet, label: 'Money', badge: unpaidCount, badgeColor: 'bg-amber-500' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', badge: 0, badgeColor: '' },
    { to: '/settings', icon: Settings, label: 'Settings', badge: pendingCount, badgeColor: 'bg-orange-500' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-18 max-w-lg mx-auto py-2">
        {navItems.map(({ to, icon: Icon, label, badge, badgeColor }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all duration-200 touch-sm",
              "text-muted-foreground hover:text-primary"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {badge > 0 && (
                <span className={cn(
                  "absolute -top-1.5 -right-2 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white rounded-full px-1.5",
                  badgeColor || 'bg-primary'
                )}>
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