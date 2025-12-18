import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import type { PluginOption } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "analyze" &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "logo.png", "app-icon.png"],
      manifest: {
        name: "SoloWipe",
        short_name: "SoloWipe",
        description: "Track jobs, manage customers, boost earnings",
        theme_color: "#007AFF",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "app-icon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "app-icon.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "app-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep sourcemaps off by default for smaller production payloads.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Content hashing for aggressive cache busting - prevents stale bundle errors
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Simplified chunking strategy to prevent React/Radix UI loading issues
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // CRITICAL: Bundle React, React DOM, Scheduler, and Radix UI together
          // This ensures React is always available when Radix UI initializes
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("@radix-ui")
          )
            return "react-vendor";
          
          // React Router can be separate but depends on React
          if (id.includes("react-router-dom")) return "react-router";
          
          // Other large dependencies
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts") || id.includes("/d3-")) return "charts";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/") ||
            id.includes("/zod/")
          )
            return "forms";
          if (id.includes("/date-fns/") || id.includes("react-day-picker")) return "dates";

          return "vendor";
        },
      },
    },
    // Ensure proper chunk loading order
    chunkSizeWarningLimit: 1000,
  },
}));
