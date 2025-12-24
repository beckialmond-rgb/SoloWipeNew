import { useState, useEffect } from 'react';

interface TimezoneInfo {
  timezone: string;
  offset: number; // Offset in minutes from UTC
  isLocationBased: boolean;
}

/**
 * Hook to get user's timezone, defaulting to GMT if location is not available
 * Uses browser's Intl API to detect timezone, which works without geolocation permission
 */
export function useTimezone(): TimezoneInfo {
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo>(() => {
    // Default to GMT/UTC
    return {
      timezone: 'Europe/London', // GMT/BST timezone
      offset: 0,
      isLocationBased: false,
    };
  });

  useEffect(() => {
    try {
      // Use Intl API to get the browser's detected timezone
      // This works without geolocation permission as it uses system settings
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      if (!detectedTimezone) {
        console.warn('[useTimezone] No timezone detected, using GMT');
        return;
      }

      // Calculate offset in minutes from UTC
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      
      // Create a date in the detected timezone
      const localFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: detectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const utcFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const localParts = localFormatter.formatToParts(now);
      const utcParts = utcFormatter.formatToParts(now);
      
      const parseParts = (parts: Intl.DateTimeFormatPart[]) => {
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10) - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
        return new Date(year, month, day, hour, minute, second);
      };
      
      const localDate = parseParts(localParts);
      const utcDate = parseParts(utcParts);
      
      // Calculate offset in minutes
      const offset = (localDate.getTime() - utcDate.getTime()) / (1000 * 60);

      setTimezoneInfo({
        timezone: detectedTimezone,
        offset,
        isLocationBased: detectedTimezone !== 'Europe/London' && detectedTimezone !== 'UTC',
      });
    } catch (error) {
      console.warn('[useTimezone] Error detecting timezone, defaulting to GMT:', error);
      // Keep default GMT if detection fails
    }
  }, []);

  return timezoneInfo;
}


