import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, CreditCard, UserPlus, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

type AnimationType = 'check' | 'payment' | 'customer' | 'reschedule';

interface SuccessAnimationProps {
  show: boolean;
  type?: AnimationType;
  message?: string;
  onComplete?: () => void;
}

const iconMap = {
  check: Check,
  payment: CreditCard,
  customer: UserPlus,
  reschedule: Calendar,
};

const colorMap = {
  check: 'bg-success text-success-foreground',
  payment: 'bg-success text-success-foreground',
  customer: 'bg-primary text-primary-foreground',
  reschedule: 'bg-accent text-accent-foreground',
};

export function SuccessAnimation({ 
  show, 
  type = 'check', 
  message,
  onComplete 
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = iconMap[type];
  const colorClass = colorMap[type];

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background"
          />
          
          {/* Success Circle */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 15 
            }}
            className="relative"
          >
            {/* Sparkle Effects */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  opacity: [1, 0.8, 0],
                }}
                transition={{ 
                  delay: 0.2 + i * 0.1,
                  duration: 0.6,
                }}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${i * 60}deg) translateY(-60px)`,
                }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </motion.div>
            ))}
            
            {/* Main Circle */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className={`w-24 h-24 rounded-full ${colorClass} flex items-center justify-center shadow-lg`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              >
                <Icon className="w-12 h-12" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Message */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-1/3 text-lg font-semibold text-foreground"
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
