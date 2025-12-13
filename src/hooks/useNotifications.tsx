import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive alerts about upcoming jobs.",
        });
        // Store preference in localStorage
        localStorage.setItem('solowipe_notifications_enabled', 'true');
        return true;
      } else if (result === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        localStorage.setItem('solowipe_notifications_enabled', 'false');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const disableNotifications = useCallback(() => {
    localStorage.setItem('solowipe_notifications_enabled', 'false');
    toast({
      title: "Notifications Disabled",
      description: "You won't receive job alerts anymore.",
    });
  }, [toast]);

  const isEnabled = permission === 'granted' && 
    localStorage.getItem('solowipe_notifications_enabled') !== 'false';

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    sendNotification,
    disableNotifications,
  };
};
