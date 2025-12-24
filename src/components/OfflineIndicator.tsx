import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Cloud, CloudOff, Wifi, CheckCircle } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOffline();
  const { wasOffline, acknowledgeReconnection } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Show reconnection banner when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && !isSyncing) {
      setShowReconnected(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        acknowledgeReconnection();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline, isSyncing, acknowledgeReconnection]);

  // Simulate sync progress animation
  useEffect(() => {
    if (isSyncing) {
      setSyncProgress(0);
      const interval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 15, 90));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setSyncProgress(100);
    }
  }, [isSyncing]);

  const shouldShow = !isOnline || pendingCount > 0 || isSyncing || showReconnected;
  const isQueueLarge = pendingCount >= 50;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div
            className={cn(
              "relative overflow-hidden",
              !isOnline
                ? isQueueLarge
                  ? 'bg-red-600 text-white'
                  : 'bg-amber-500 text-amber-950'
                : showReconnected && !isSyncing
                ? 'bg-emerald-500 text-emerald-950'
                : isSyncing
                ? 'bg-primary text-primary-foreground'
                : isQueueLarge
                ? 'bg-orange-500 text-white'
                : 'bg-blue-500 text-white'
            )}
          >
            {/* Sync progress bar */}
            {isSyncing && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-white/30"
                initial={{ width: '0%' }}
                animate={{ width: `${syncProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            )}
            
            <div className="px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline Mode</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-900/20 px-2 py-0.5 rounded-full text-xs">
                      {pendingCount} pending
                    </span>
                  )}
                </>
              ) : showReconnected && !isSyncing ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Back online — all synced!</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <Cloud className="h-4 w-4" />
                  <span>
                    {pendingCount} change{pendingCount > 1 ? 's' : ''} will sync shortly
                    {isQueueLarge && (
                      <span className="ml-2 font-semibold">⚠️ Queue is large - sync soon!</span>
                    )}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for use within components
export function OfflineBadge() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        !isOnline
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-3 w-3" />
          Offline
        </>
      ) : (
        <>
          <Cloud className="h-3 w-3" />
          {pendingCount} pending
        </>
      )}
    </span>
  );
}
