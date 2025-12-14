import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SkeletonLoader } from './SkeletonLoader';

interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
  skeletonType?: 'job-card' | 'customer-card' | 'earnings' | 'list';
  skeletonCount?: number;
}

export function LoadingState({ 
  message = 'Loading...', 
  type = 'spinner',
  skeletonType = 'list',
  skeletonCount = 3,
}: LoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-4"
      >
        <SkeletonLoader type={skeletonType} count={skeletonCount} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-primary" />
      </motion.div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}
