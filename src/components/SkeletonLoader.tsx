import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonLoaderProps {
  type: 'job-card' | 'customer-card' | 'earnings' | 'list';
  count?: number;
}

function JobCardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-card rounded-xl border border-border p-4"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="w-20 h-10 rounded-lg" />
      </div>
    </motion.div>
  );
}

function CustomerCardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-card rounded-xl border border-border p-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="w-16 h-6 rounded-md" />
      </div>
    </motion.div>
  );
}

function EarningsSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="space-y-4"
    >
      {/* Summary Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-10 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Chart Area */}
      <div className="bg-card rounded-xl border border-border p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="flex items-end gap-2 h-32">
          {[40, 60, 45, 80, 55, 70].map((height, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ListSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-card rounded-xl border border-border p-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </motion.div>
  );
}

export function SkeletonLoader({ type, count = 3 }: SkeletonLoaderProps) {
  const SkeletonComponent = {
    'job-card': JobCardSkeleton,
    'customer-card': CustomerCardSkeleton,
    'earnings': EarningsSkeleton,
    'list': ListSkeleton,
  }[type];

  if (type === 'earnings') {
    return <SkeletonComponent />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <SkeletonComponent />
        </motion.div>
      ))}
    </div>
  );
}
