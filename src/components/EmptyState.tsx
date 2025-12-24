import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({ 
  title, 
  description, 
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center relative"
    >
      {/* Award-Winning Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Premium Icon Container */}
      <motion.div 
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          delay: 0.1, 
          type: 'spring', 
          stiffness: 200,
          damping: 15
        }}
        className="relative mb-8"
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Icon container */}
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-depth-3 backdrop-premium">
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {icon || <Sparkles className="w-12 h-12 text-primary" />}
          </motion.div>
        </div>
      </motion.div>
      
      {/* Premium Typography */}
      <motion.h3 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        className="text-2xl md:text-3xl font-extrabold text-foreground mb-3 text-gradient-primary"
      >
        {title}
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground max-w-md mb-8 text-base leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Premium Action Buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-3 w-full max-w-xs relative z-10"
        >
          {actionLabel && onAction && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={onAction}
                size="lg"
                className="w-full min-h-[52px] text-base font-semibold shadow-depth-3 hover:shadow-depth-4 btn-premium"
              >
                {actionLabel}
              </Button>
            </motion.div>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={onSecondaryAction}
                variant="outline"
                size="lg"
                className="w-full min-h-[52px] text-base font-semibold border-2 hover:border-primary/50 hover:shadow-md"
              >
                {secondaryActionLabel}
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
