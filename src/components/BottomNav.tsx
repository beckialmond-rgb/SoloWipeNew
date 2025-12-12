import { Home, Users, Wallet, TrendingUp, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Today' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/money', icon: Wallet, label: 'Money' },
  { to: '/earnings', icon: TrendingUp, label: 'Earnings' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
              "text-muted-foreground hover:text-primary"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
