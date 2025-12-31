import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { NotificationList } from './NotificationList';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Notification bell component for helpers (Phase 5)
 * Shows unread count badge and opens notification list on click
 */
export function NotificationBell() {
  const { unreadCount, isLoading } = useInAppNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {!isLoading && unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            variant="destructive"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      <NotificationList isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

