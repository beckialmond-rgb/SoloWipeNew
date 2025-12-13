import { useEffect, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { format, isToday, isTomorrow, addHours, isWithinInterval } from 'date-fns';

interface Job {
  id: string;
  scheduled_date: string;
  status: string;
  customer?: {
    name: string;
    address: string;
  } | null;
}

export const useJobReminders = (jobs: Job[]) => {
  const { isEnabled, sendNotification } = useNotifications();
  const notifiedJobsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!isEnabled || jobs.length === 0) return;

    const checkUpcomingJobs = () => {
      const now = new Date();
      
      // Only check once per hour to avoid spam
      if (lastCheckRef.current) {
        const hoursSinceLastCheck = (now.getTime() - lastCheckRef.current.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCheck < 1) return;
      }

      const pendingJobs = jobs.filter(job => job.status === 'pending');
      
      // Check for tomorrow's jobs (remind once per day)
      const tomorrowsJobs = pendingJobs.filter(job => {
        const jobDate = new Date(job.scheduled_date);
        return isTomorrow(jobDate);
      });

      if (tomorrowsJobs.length > 0) {
        const notificationKey = `tomorrow-${format(now, 'yyyy-MM-dd')}`;
        
        if (!notifiedJobsRef.current.has(notificationKey)) {
          notifiedJobsRef.current.add(notificationKey);
          
          if (tomorrowsJobs.length === 1) {
            const job = tomorrowsJobs[0];
            sendNotification('Job Tomorrow', {
              body: `${job.customer?.name || 'Customer'} - ${job.customer?.address || 'Address'}`,
              tag: 'tomorrow-reminder',
            });
          } else {
            sendNotification('Jobs Tomorrow', {
              body: `You have ${tomorrowsJobs.length} jobs scheduled for tomorrow.`,
              tag: 'tomorrow-reminder',
            });
          }
        }
      }

      // Check for today's jobs (morning reminder)
      const todaysJobs = pendingJobs.filter(job => {
        const jobDate = new Date(job.scheduled_date);
        return isToday(jobDate);
      });

      if (todaysJobs.length > 0) {
        const morningKey = `today-morning-${format(now, 'yyyy-MM-dd')}`;
        
        // Only send morning reminder between 7am and 9am
        const hour = now.getHours();
        if (hour >= 7 && hour <= 9 && !notifiedJobsRef.current.has(morningKey)) {
          notifiedJobsRef.current.add(morningKey);
          
          sendNotification('Good morning! ☀️', {
            body: `You have ${todaysJobs.length} job${todaysJobs.length > 1 ? 's' : ''} scheduled today.`,
            tag: 'morning-reminder',
          });
        }
      }

      lastCheckRef.current = now;
    };

    // Check immediately on mount
    checkUpcomingJobs();

    // Check every 30 minutes
    const interval = setInterval(checkUpcomingJobs, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isEnabled, jobs, sendNotification]);

  // Clean up old notification keys daily
  useEffect(() => {
    const cleanup = () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      notifiedJobsRef.current.forEach(key => {
        if (!key.includes(today)) {
          notifiedJobsRef.current.delete(key);
        }
      });
    };

    cleanup();
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
};
