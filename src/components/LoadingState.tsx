import { Loader2 } from 'lucide-react';
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
      <div className="py-4 animate-in fade-in">
        <SkeletonLoader type={skeletonType} count={skeletonCount} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 animate-in fade-in">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
