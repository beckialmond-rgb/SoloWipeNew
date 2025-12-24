import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  // App can't render without a mount point; avoid hard-throwing into an unfriendly crash screen.
  console.error("[main] Root element not found (#root). Check index.html.");
} else {
  try {
    // Wrap app in ErrorBoundary at root level to catch all runtime errors.
    createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("[main] Failed to render app:", err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:560px;width:100%;">
          <h1 style="font-size:20px;margin:0 0 8px 0;">Something went wrong</h1>
          <p style="margin:0 0 16px 0;opacity:0.8;">
            Please reload the page. If the problem persists, try clearing site data (cache/storage) and retry.
          </p>
          <button onclick="window.location.reload()" style="padding:10px 14px;border-radius:8px;border:1px solid rgba(0,0,0,0.2);background:#fff;cursor:pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}