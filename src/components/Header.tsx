import { motion } from 'framer-motion';
import { WeatherWidget } from './WeatherWidget';
import { useTimezone } from '@/hooks/useTimezone';

interface HeaderProps {
  showLogo?: boolean;
  title?: string;
  rightContent?: React.ReactNode;
  showWeather?: boolean;
}

export function Header({ showLogo = true, title, rightContent, showWeather = false }: HeaderProps) {
  const { timezone } = useTimezone();
  
  // Format date in user's timezone (defaults to GMT/Europe/London)
  const today = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-background/98 backdrop-premium border-b border-border/60 shadow-lg">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showLogo ? (
            <motion.img 
              src="/SoloLogo.jpg" 
              alt="SoloWipe" 
              className="h-8 w-auto transition-transform hover:scale-105"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          ) : title ? (
            <h1 className="text-xl font-bold text-foreground text-sunlight">{title}</h1>
          ) : null}
        </div>
        
        <div className="flex items-center gap-3">
          {showWeather && <WeatherWidget />}
          {rightContent || (
            <motion.span 
              className="text-sm font-semibold text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {today}
            </motion.span>
          )}
        </div>
      </div>
    </header>
  );
}
