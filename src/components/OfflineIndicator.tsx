import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  return (
    <AnimatePresence>
      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div
            className={`px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 ${
              !isOnline
                ? 'bg-amber-500 text-amber-950'
                : isSyncing
                ? 'bg-blue-500 text-white'
                : 'bg-emerald-500 text-emerald-950'
            }`}
          >
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
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing changes...</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Cloud className="h-4 w-4" />
                <span>{pendingCount} change{pendingCount > 1 ? 's' : ''} will sync shortly</span>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for use within components
export function OfflineBadge() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        !isOnline
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }`}
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
