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
      '@tanstack/react-query-persist-client',
      '@tanstack/query-async-storage-persister',
    ],
    // Exclude problematic packages from optimization if needed
    exclude: [],
    // Ensure proper dependency resolution
    esbuildOptions: {
      // Ensure proper hoisting of React
      target: 'es2020',
      // Ensure proper handling of circular dependencies
      legalComments: 'none',
    },
    // Force re-optimization to clear any cached problematic bundles
    force: false,
  },
  build: {
    // Enable sourcemaps temporarily to help debug circular dependency issues
    sourcemap: true,
    rollupOptions: {
      // Preserve entry signatures to ensure proper initialization order
      preserveEntrySignatures: 'strict',
      output: {
        // CRITICAL: Force true single-file bundle
        // Use inlineDynamicImports to inline ALL dynamic imports (lazy-loaded routes)
        // This completely eliminates chunk loading and circular dependency issues
        inlineDynamicImports: true,
        // Single entry file name
        entryFileNames: 'assets/index.js',
        // Asset files keep hashing for cache busting
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Use ES module format - required for modern browser module loading
        format: 'es',
        // Ensure proper variable naming and prevent hoisting issues
        // constBindings: true ensures variables are declared with const/let
        // which helps prevent TDZ (Temporal Dead Zone) violations
        generatedCode: {
          constBindings: true,
          objectShorthand: true,
        },
        // Ensure proper handling of exports
        exports: 'auto',
        // Don't compact code during build to preserve initialization order
        // Minification happens separately and won't affect module initialization
        compact: false,
      },
      // Externalize nothing - bundle everything together
      external: [],
      // Configure tree-shaking to preserve side effects that might be needed for initialization
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Very high chunk size limit to allow single bundle
    chunkSizeWarningLimit: 10000,
    // Use commonjs format for better compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      // Ensure proper handling of circular dependencies
      strictRequires: false,
    },
    // Use esbuild for minification (Vite default) with options that preserve initialization order
    minify: 'esbuild',
    // esbuild options are configured via build.esbuild in Vite
  },
  esbuild: {
    // Ensure esbuild doesn't break initialization order
    legalComments: 'none',
    // Keep names for better error messages
    keepNames: false,
  },
}));
