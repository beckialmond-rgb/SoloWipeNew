import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as NavigatorWithStandalone).standalone === true;
      setIsInstalled(isStandalone);
      
      // If installed, ensure install prompt state is reset
      if (isStandalone) {
        setDeferredPrompt(null);
        setCanInstall(false);
      }
    };
    
    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    
    // Use addEventListener for better browser support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkInstalled);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(checkInstalled);
    }

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkInstalled);
      } else {
        mediaQuery.removeListener(checkInstalled);
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user's choice
      const { outcome } = await deferredPrompt.userChoice;
      
      // Clean up after user makes a choice
      setDeferredPrompt(null);
      setCanInstall(false);
      
      if (outcome === 'accepted') {
        // Installation will trigger 'appinstalled' event
        return true;
      }
      
      // User dismissed - prompt may become available again later
      return false;
    } catch (error) {
      console.error('Error prompting install:', error);
      // On error, clean up the deferred prompt
      setDeferredPrompt(null);
      setCanInstall(false);
      return false;
    }
  }, [deferredPrompt]);

  return {
    canInstall,
    isInstalled,
    promptInstall,
  };
};
