import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
// CSS import - if this fails, the app should still work (just without styles)
import "./index.css";

// Log device information for mobile debugging
const deviceInfo = {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  online: navigator.onLine,
  cookieEnabled: navigator.cookieEnabled,
  storageAvailable: {
    localStorage: (() => {
      try {
        localStorage.setItem('__test__', '1');
        localStorage.removeItem('__test__');
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('__test__', '1');
        sessionStorage.removeItem('__test__');
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
  },
  isMobile: /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()),
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: /Android/.test(navigator.userAgent),
};

console.log('[main] App starting...');
console.log('[main] Environment:', {
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD,
  dev: import.meta.env.DEV,
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
});
console.log('[main] Device info:', deviceInfo);

// Warn if storage is unavailable (common on mobile in private mode)
if (!deviceInfo.storageAvailable.localStorage || !deviceInfo.storageAvailable.sessionStorage) {
  console.warn('[main] ⚠️ Storage may be limited. Some features may not work properly.');
}

// Signal that React is mounting
window.__SOLOWIPE_REACT_MOUNTING__ = true;

const rootElement = document.getElementById("root");

if (!rootElement) {
  // App can't render without a mount point; avoid hard-throwing into an unfriendly crash screen.
  console.error("[main] Root element not found (#root). Check index.html.");
  window.__SOLOWIPE_REACT_MOUNTING__ = false;
} else {
  try {
    // Wrap app in ErrorBoundary at root level to catch all runtime errors.
    const root = createRoot(rootElement);
    
    // Try to render with a timeout to catch hanging renders
    const renderTimeout = setTimeout(() => {
      if (!window.__SOLOWIPE_REACT_MOUNTED__) {
        console.error("[main] React render appears to be hanging");
      }
    }, 5000);
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    // Signal successful mount
    setTimeout(() => {
      clearTimeout(renderTimeout);
      window.__SOLOWIPE_REACT_MOUNTED__ = true;
      window.__SOLOWIPE_REACT_MOUNTING__ = false;
      console.log("[main] React app mounted successfully");
      
      // Hide loading fallback
      const fallback = document.getElementById('loading-fallback');
      if (fallback) fallback.style.display = 'none';
    }, 100);
  } catch (err) {
    console.error("[main] Failed to render app:", err);
    console.error("[main] Error details:", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : undefined,
    });
    console.error("[main] Device info at error:", deviceInfo);
    window.__SOLOWIPE_REACT_MOUNTING__ = false;
    
    // Show user-friendly error
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;">
        <div style="max-width:560px;width:100%;background:white;padding:24px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="font-size:20px;margin:0 0 8px 0;color:#1a1a1a;">Something went wrong</h1>
          <p style="margin:0 0 16px 0;opacity:0.7;color:#666;font-size:14px;">
            The application failed to load. This might be due to a network issue or browser compatibility problem.
          </p>
          <div style="margin:16px 0;padding:12px;background:#fff3cd;border-radius:6px;border-left:4px solid #ffc107;">
            <p style="margin:0;font-size:13px;color:#856404;">
              <strong>Try these steps:</strong><br/>
              1. Check your internet connection<br/>
              2. Clear your browser cache<br/>
              3. Try refreshing the page<br/>
              4. Check the browser console for details
            </p>
          </div>
          <button onclick="window.location.reload()" style="padding:10px 20px;border-radius:6px;border:none;background:#007AFF;color:white;cursor:pointer;font-size:14px;font-weight:500;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}