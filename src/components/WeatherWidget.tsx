import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudSun, Snowflake, Wind, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTimezone } from '@/hooks/useTimezone';

interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'partly-cloudy' | 'rain' | 'snow' | 'wind';
  description: string;
  rainExpected?: string;
}

// Simple weather simulation based on UK patterns
// In production, you'd connect to OpenWeatherMap API
function getSimulatedWeather(timezone: string): WeatherData {
  // Get current hour and month in the user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    month: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  
  // Base temp varies by month (UK climate)
  const baseTemp = [4, 5, 7, 10, 14, 17, 19, 19, 16, 12, 7, 5][month];
  const temp = baseTemp + Math.floor(Math.random() * 6) - 2;
  
  // UK is often cloudy/rainy
  const conditions: WeatherData['condition'][] = ['sunny', 'partly-cloudy', 'cloudy', 'rain'];
  const weights = month >= 4 && month <= 8 
    ? [0.3, 0.35, 0.25, 0.1]  // Summer: more sun
    : [0.1, 0.25, 0.35, 0.3]; // Winter: more rain
  
  const random = Math.random();
  let cumulative = 0;
  let condition: WeatherData['condition'] = 'cloudy';
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      condition = conditions[i];
      break;
    }
  }
  
  // Rain warning for afternoon (formatted in user's timezone)
  const rainExpected = condition !== 'rain' && Math.random() > 0.7 
    ? `${12 + Math.floor(Math.random() * 6)}:00`
    : undefined;
  
  const descriptions: Record<WeatherData['condition'], string> = {
    'sunny': 'Clear skies',
    'partly-cloudy': 'Partly cloudy',
    'cloudy': 'Overcast',
    'rain': 'Light rain',
    'snow': 'Snow',
    'wind': 'Windy',
  };
  
  return {
    temp,
    condition,
    description: descriptions[condition],
    rainExpected,
  };
}

const WeatherIcon = ({ condition }: { condition: WeatherData['condition'] }) => {
  const iconClass = "w-5 h-5";
  
  switch (condition) {
    case 'sunny':
      return <Sun className={`${iconClass} text-yellow-500`} />;
    case 'partly-cloudy':
      return <CloudSun className={`${iconClass} text-muted-foreground`} />;
    case 'cloudy':
      return <Cloud className={`${iconClass} text-muted-foreground`} />;
    case 'rain':
      return <CloudRain className={`${iconClass} text-primary`} />;
    case 'snow':
      return <Snowflake className={`${iconClass} text-blue-300`} />;
    case 'wind':
      return <Wind className={`${iconClass} text-muted-foreground`} />;
  }
};

export function WeatherWidget() {
  const { timezone } = useTimezone();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  useEffect(() => {
    // Initial load
    setWeather(getSimulatedWeather(timezone));
    
    // Update every 30 minutes
    const interval = setInterval(() => {
      setWeather(getSimulatedWeather(timezone));
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);
  
  if (!weather) return null;
  
  return (
    <div className="flex items-center gap-2">
      {weather.rainExpected && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-full"
        >
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Rain ~{weather.rainExpected}
          </span>
        </motion.div>
      )}
      
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <WeatherIcon condition={weather.condition} />
        <span className="font-medium">{weather.temp}°C</span>
      </div>
    </div>
  );
}
