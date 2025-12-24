import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [pendingPrefix, setPendingPrefix] = useState<string | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key.toLowerCase();

    // Show help with ?
    if (event.key === '?' && event.shiftKey) {
      event.preventDefault();
      setShowShortcutsHelp(true);
      return;
    }

    // Close help with Escape
    if (event.key === 'Escape') {
      setShowShortcutsHelp(false);
      setPendingPrefix(null);
      return;
    }

    // Handle "g" prefix for navigation
    if (pendingPrefix === 'g') {
      event.preventDefault();
      setPendingPrefix(null);
      
      switch (key) {
        case 'h':
          navigate('/');
          break;
        case 'c':
          navigate('/calendar');
          break;
        case 'm':
          navigate('/money');
          break;
        case 'u':
          navigate('/customers');
          break;
        case 's':
          navigate('/settings');
          break;
      }
      return;
    }

    // Start "g" prefix
    if (key === 'g') {
      setPendingPrefix('g');
      // Clear prefix after 1 second if no follow-up
      setTimeout(() => setPendingPrefix(null), 1000);
      return;
    }
  }, [navigate, pendingPrefix]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcutsHelp,
    setShowShortcutsHelp,
    pendingPrefix,
  };
}
