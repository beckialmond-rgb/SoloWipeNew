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

  // Light tap - for button presses
  const lightTap = useCallback(() => vibrate(15), [vibrate]);

  // Medium tap - for selections and toggles
  const mediumTap = useCallback(() => vibrate(30), [vibrate]);

  // Success - double pulse for completed actions
  const success = useCallback(() => vibrate([50, 50, 50]), [vibrate]);

  // Warning - longer pulse
  const warning = useCallback(() => vibrate(100), [vibrate]);

  // Error - sharp double pulse
  const error = useCallback(() => vibrate([100, 50, 100]), [vibrate]);

  // Heavy - for important confirmations
  const heavy = useCallback(() => vibrate(150), [vibrate]);

  // Notification - gentle attention
  const notification = useCallback(() => vibrate([30, 30, 30, 30]), [vibrate]);

  return { 
    vibrate, 
    lightTap, 
    mediumTap, 
    success, 
    warning, 
    error, 
    heavy,
    notification,
  };
}
