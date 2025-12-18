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
  optimizeDeps: {
    // Force pre-bundling of React and React-dependent packages
    // This helps resolve circular dependencies and initialization order issues
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-slot',
      '@tanstack/react-query',
    ],
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
        // Minimal chunking strategy to prevent circular dependency and initialization issues
        // Only split very large, independent libraries
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // CRITICAL: Put everything except Supabase in react-vendor
          // This prevents ALL circular dependency and initialization order issues
          // Only Supabase is truly independent and can be split safely
          if (id.includes("@supabase")) return "supabase";
          
          // Everything else (React, React deps, zod, date-fns, d3, etc.) goes in one chunk
          // This eliminates circular dependency issues completely
          return "react-vendor";
        },
      },
    },
    // Ensure proper chunk loading order
    chunkSizeWarningLimit: 1000,
  },
}));
