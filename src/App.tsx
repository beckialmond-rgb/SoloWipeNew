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
import { SMSTemplateProvider } from "@/contexts/SMSTemplateContext";

import { OfflineIndicator } from "@/components/OfflineIndicator";

const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ROICalculator = lazy(() => import("./pages/ROICalculator").then(m => ({ default: m.ROICalculator })));
const SetupChecklistPage = lazy(() => import("./pages/SetupChecklistPage").then(m => ({ default: m.SetupChecklistPage })));

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
const HelperEarnings = lazy(() => import("./pages/HelperEarnings"));
const HelperPerformance = lazy(() => import("./pages/HelperPerformance"));
const HelperSchedule = lazy(() => import("./pages/HelperSchedule"));
const HelperDashboard = lazy(() => import("./pages/HelperDashboard"));
const HelperInvoices = lazy(() => import("./pages/HelperInvoices"));
const HelperMyInvoices = lazy(() => import("./pages/HelperMyInvoices"));
const MySchedule = lazy(() => import("./pages/MySchedule"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const SMSTemplates = lazy(() => import("./pages/SMSTemplates"));
const Install = lazy(() => import("./pages/Install"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const JobShowcaseExample = lazy(() => import("./components/JobShowcase/JobShowcaseExample"));
const GoCardlessCallback = lazy(() => import("./pages/GoCardlessCallback").then(m => ({ default: m.GoCardlessCallback })));
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
              <SMSTemplateProvider>
                <TooltipProvider>
                <OfflineIndicator />
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
                        <Route path="/" element={<Landing />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/legal" element={<Legal />} />
                        <Route path="/cookies" element={<CookiePolicy />} />
                        <Route path="/showcase" element={<JobShowcaseExample />} />
                        <Route path="/gocardless-callback" element={<GoCardlessCallback />} />
                        <Route path="/roi-calculator" element={<ROICalculator />} />
                        <Route path="/setup-checklist" element={<SetupChecklistPage />} />

                        <Route element={<Layout />}>
                          <Route
                            path="/dashboard"
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
                            path="/helper"
                            element={
                              <ProtectedRoute>
                                <HelperDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/helper-earnings"
                            element={
                              <ProtectedRoute>
                                <HelperEarnings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/helper-performance"
                            element={
                              <ProtectedRoute>
                                <HelperPerformance />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/helper-schedule"
                            element={
                              <ProtectedRoute>
                                <HelperSchedule />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/helper-invoices"
                            element={
                              <ProtectedRoute>
                                <HelperInvoices />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/helper-my-invoices"
                            element={
                              <ProtectedRoute>
                                <HelperMyInvoices />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/my-schedule"
                            element={
                              <ProtectedRoute>
                                <MySchedule />
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
                          <Route
                            path="/settings/sms-templates"
                            element={
                              <ProtectedRoute>
                                <SMSTemplates />
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
              </SMSTemplateProvider>
            </OfflineProvider>
          </SoftPaywallProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
};

export default App;