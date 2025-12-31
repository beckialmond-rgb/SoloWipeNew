import { motion } from 'framer-motion';
import { WeatherWidget } from './WeatherWidget';
import { NotificationBell } from './NotificationBell';
import { useTimezone } from '@/hooks/useTimezone';
import { useRole } from '@/hooks/useRole';

interface HeaderProps {
  showLogo?: boolean;
  title?: string;
  rightContent?: React.ReactNode;
  showWeather?: boolean;
}

export function Header({ showLogo = true, title, rightContent, showWeather = false }: HeaderProps) {
  const { timezone } = useTimezone();
  const { isHelper, isOwner } = useRole();
  
  // Format date in user's timezone (defaults to GMT/Europe/London)
  const today = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  // Show notification bell for helpers (but not for owners who are also helpers)
  const showNotificationBell = isHelper && !isOwner;

  return (
    <header className="sticky top-0 z-40 bg-background/98 dark:bg-background/95 backdrop-premium border-b border-border/60 dark:border-border/80 shadow-lg">
      <div className="flex items-center justify-between h-16 md:h-18 px-4 md:px-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showLogo ? (
            <motion.img 
              src="/SoloLogo.jpg" 
              alt="SoloWipe" 
              className="h-8 md:h-10 w-auto transition-transform hover:scale-105"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          ) : title ? (
            <h1 className="text-xl font-bold text-foreground text-sunlight">{title}</h1>
          ) : null}
        </div>
        
        <div className="flex items-center gap-3">
          {showWeather && <WeatherWidget />}
          {showNotificationBell && <NotificationBell />}
          {rightContent || (
            <motion.span 
              className="text-sm md:text-base font-semibold text-muted-foreground dark:text-muted-foreground/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {today}
            </motion.span>
          )}
        </div>
      </div>
    </header>
  );
}
