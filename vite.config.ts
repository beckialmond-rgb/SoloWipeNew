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
    // Dedupe React to ensure single instance and prevent circular deps
    dedupe: ['react', 'react-dom'],
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
    // Ensure proper dependency resolution
    esbuildOptions: {
      // Ensure proper hoisting of React
      target: 'es2020',
    },
  },
  // Ensure proper module resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe React to ensure single instance
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Enable sourcemaps temporarily to help debug circular dependency issues
    sourcemap: true,
    rollupOptions: {
      output: {
        // Content hashing for aggressive cache busting - prevents stale bundle errors
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Use a function that returns undefined to disable chunking entirely
        // This puts everything in one bundle, eliminating circular dependency issues
        manualChunks() {
          return undefined;
        },
        // Ensure proper module format
        format: 'es',
        // Preserve module structure to avoid circular dependency issues
        preserveModules: false,
      },
      // Externalize nothing - bundle everything together
      external: [],
    },
    // Increase chunk size warning limit since we're bundling everything
    chunkSizeWarningLimit: 2000,
    // Use commonjs format for better compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
