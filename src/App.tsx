import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SoftPaywallProvider } from "@/hooks/useSoftPaywall";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { ReloadPrompt } from "@/components/ReloadPrompt";
import { LoadingState } from "@/components/LoadingState";
import { queryPersister, CACHE_TIME, STALE_TIME } from "@/lib/queryPersister";
import { Layout } from "@/components/Layout";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));

const OfflineIndicator = lazy(() =>
  import("@/components/OfflineIndicator").then((m) => ({ default: m.OfflineIndicator }))
);
const WhatsNewModal = lazy(() =>
  import("@/components/WhatsNewModal").then((m) => ({ default: m.WhatsNewModal }))
);
const TrialGateModal = lazy(() =>
  import("@/components/TrialGateModal").then((m) => ({ default: m.TrialGateModal }))
);

// Lazy loaded pages (less frequently used, heavier bundles)
const Customers = lazy(() => import("./pages/Customers"));
const Money = lazy(() => import("./pages/Money"));
const Earnings = lazy(() => import("./pages/Earnings"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Install = lazy(() => import("./pages/Install"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_TIME, // Keep data in cache for 24 hours
      staleTime: STALE_TIME, // Data is fresh for 5 minutes
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      networkMode: 'offlineFirst', // Use cache first, then fetch
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: CACHE_TIME,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Persist all successful queries
              return query.state.status === 'success';
            },
          },
        }}
      >
        <AuthProvider>
          <SoftPaywallProvider>
            <OfflineProvider>
              <TooltipProvider>
              <Suspense fallback={null}>
                <OfflineIndicator />
              </Suspense>
              <ReloadPrompt />
              <Suspense fallback={null}>
                <WhatsNewModal />
              </Suspense>
              <Toaster />
              <Sonner />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <Suspense fallback={null}>
                    <TrialGateModal />
                  </Suspense>
                  <KeyboardShortcutsProvider>
                    <Suspense fallback={<LoadingState message="Loading..." />}>
                      <Routes>
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />

                        <Route element={<Layout />}>
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <Index />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers"
                            element={
                              <ProtectedRoute>
                                <Customers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/money"
                            element={
                              <ProtectedRoute>
                                <Money />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/earnings"
                            element={
                              <ProtectedRoute>
                                <Earnings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/calendar"
                            element={
                              <ProtectedRoute>
                                <Calendar />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="*" element={<NotFound />} />
                        </Route>
                      </Routes>
                    </Suspense>
                  </KeyboardShortcutsProvider>
                </BrowserRouter>
              </TooltipProvider>
            </OfflineProvider>
          </SoftPaywallProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
};

export default App;