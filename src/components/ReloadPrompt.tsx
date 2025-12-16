import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates periodically (keep it light for mobile battery/CPU).
      if (r) {
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000); // 5 minutes
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

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
