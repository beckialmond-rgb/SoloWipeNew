import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearAllCaches } from './ErrorBoundary';

// Expose a global function for forcing updates from anywhere in the app
declare global {
  interface Window {
    __forcePWAUpdate?: () => void;
  }
}

export function ReloadPrompt() {
  const updateIntervalRef = useRef<number | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates periodically (keep it light for mobile battery/CPU).
      if (r) {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
        updateIntervalRef.current = window.setInterval(() => {
          r.update();
        }, 5 * 60 * 1000); // 5 minutes
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const forceUpdate = useCallback(async () => {
    console.log('[ReloadPrompt] Force update triggered');
    await clearAllCaches();
    window.location.reload();
  }, []);

  // Expose force update globally for emergency recovery
  useEffect(() => {
    window.__forcePWAUpdate = forceUpdate;
    return () => {
      delete window.__forcePWAUpdate;
    };
  }, [forceUpdate]);

  // Ensure we don't leak update intervals (StrictMode / HMR safety)
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  // Listen for global error events that might indicate stale bundles
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const errorPatterns = [
        'forwardRef',
        'ChunkLoadError',
        'Loading chunk',
        'Failed to fetch dynamically imported module',
      ];
      
      const errorMessage = event.message || '';
      const isStaleError = errorPatterns.some(pattern => 
        errorMessage.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isStaleError) {
        console.log('[ReloadPrompt] Detected stale bundle error, forcing update...');
        forceUpdate();
      }
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, [forceUpdate]);

  useEffect(() => {
    if (needRefresh) {
      toast(
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium">New version available</p>
            <p className="text-sm text-muted-foreground">Reload to update</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              updateServiceWorker(true);
            }}
          >
            Reload
          </Button>
        </div>,
        {
          duration: Infinity,
          id: 'pwa-update',
          onDismiss: () => setNeedRefresh(false),
        }
      );
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
