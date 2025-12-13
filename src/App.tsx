import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SoftProtectedRoute } from "@/components/SoftProtectedRoute";
import { SoftPaywallProvider } from "@/hooks/useSoftPaywall";
import { TrialGateModal } from "@/components/TrialGateModal";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { queryPersister, CACHE_TIME, STALE_TIME } from "@/lib/queryPersister";
import Index from "./pages/Index";
import Customers from "./pages/Customers";
import Money from "./pages/Money";
import Earnings from "./pages/Earnings";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

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

const App = () => (
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
              <OfflineIndicator />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <DemoModeBanner />
                <TrialGateModal />
                <KeyboardShortcutsProvider>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      path="/"
                      element={
                        <SoftProtectedRoute>
                          <Index />
                        </SoftProtectedRoute>
                      }
                    />
                    <Route
                      path="/customers"
                      element={
                        <SoftProtectedRoute>
                          <Customers />
                        </SoftProtectedRoute>
                      }
                    />
                    <Route
                      path="/money"
                      element={
                        <SoftProtectedRoute>
                          <Money />
                        </SoftProtectedRoute>
                      }
                    />
                    <Route
                      path="/earnings"
                      element={
                        <SoftProtectedRoute>
                          <Earnings />
                        </SoftProtectedRoute>
                      }
                    />
                    <Route
                      path="/calendar"
                      element={
                        <SoftProtectedRoute>
                          <Calendar />
                        </SoftProtectedRoute>
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
                    <Route path="/install" element={<Install />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </KeyboardShortcutsProvider>
              </BrowserRouter>
            </TooltipProvider>
          </OfflineProvider>
        </SoftPaywallProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </ThemeProvider>
);

export default App;
