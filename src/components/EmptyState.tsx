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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6"
      >
        {icon || <Sparkles className="w-10 h-10 text-accent" />}
      </motion.div>
      
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold text-foreground mb-2"
      >
        {title}
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground max-w-xs mb-6"
      >
        {description}
      </motion.p>

      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          {actionLabel && onAction && (
            <Button 
              onClick={onAction}
              size="lg"
              className="w-full min-h-[48px]"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button 
              onClick={onSecondaryAction}
              variant="outline"
              size="lg"
              className="w-full min-h-[48px]"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
