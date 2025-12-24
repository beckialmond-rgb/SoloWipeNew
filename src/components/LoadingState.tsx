import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
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
        className="py-4 animate-in fade-in"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <SkeletonLoader type={skeletonType} count={skeletonCount} />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-16 gap-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
    >
      {/* Award-Winning Premium Spinner */}
      <div className="relative">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              "0 0 20px rgba(59, 130, 246, 0.3)",
              "0 0 40px rgba(59, 130, 246, 0.5)",
              "0 0 20px rgba(59, 130, 246, 0.3)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Main spinner with gradient */}
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary border-r-primary/60" />
        </motion.div>
        
        {/* Inner sparkle */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>
      </div>
      
      {/* Loading text with reveal animation */}
      <motion.p 
        className="text-sm font-medium text-muted-foreground text-reveal"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
