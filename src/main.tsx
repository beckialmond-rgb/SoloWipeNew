// Ensure React is loaded first before any other imports
import React from "react";
import { createRoot } from "react-dom/client";

// Verify React is available before proceeding
if (!React) {
  throw new Error('React is not properly loaded. Please clear your browser cache and try again.');
}

if (typeof React.forwardRef !== 'function' || typeof React.createContext !== 'function') {
  throw new Error('React APIs are not available. Please clear your browser cache and try again.');
}

import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);