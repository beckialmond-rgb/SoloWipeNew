import { useCallback } from 'react';

export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Vibration not supported or failed silently
      }
    }
  }, []);

  // Light tap - for queueing actions
  const lightTap = useCallback(() => vibrate(30), [vibrate]);

  // Success - double pulse for sync complete
  const success = useCallback(() => vibrate([50, 50, 50]), [vibrate]);

  // Warning - longer pulse
  const warning = useCallback(() => vibrate(100), [vibrate]);

  return { vibrate, lightTap, success, warning };
}
