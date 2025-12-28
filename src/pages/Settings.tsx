import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, LogOut, ChevronRight, Download, FileSpreadsheet, Moon, Sun, Monitor, TrendingUp, Trash2, RotateCcw, Link as LinkIcon, BarChart3, Star, HelpCircle, Bell, BellOff, RefreshCw, CloudOff, Cloud, FileJson, MessageCircle, FileText, AlertTriangle, MessageSquare, Database, CheckCircle2, Smartphone, Mail } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';
import { syncStatus } from '@/lib/offlineStorage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EditBusinessNameModal } from '@/components/EditBusinessNameModal';
import { EditGoogleReviewLinkModal } from '@/components/EditGoogleReviewLinkModal';
import { ExportEarningsModal } from '@/components/ExportEarningsModal';
import { BusinessInsights } from '@/components/BusinessInsights';
import { WelcomeTour, useWelcomeTour } from '@/components/WelcomeTour';
import { SubscriptionSection } from '@/components/SubscriptionSection';
import { GoCardlessSection } from '@/components/GoCardlessSection';
import { HelpSection } from '@/components/HelpSection';
import { DataExportModal } from '@/components/DataExportModal';
import { EmptyState } from '@/components/EmptyState';
import { PriceIncreaseWizard } from '@/components/PriceIncreaseWizard';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useNotifications } from '@/hooks/useNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { businessName, userEmail, updateBusinessName, updateGoogleReviewLink, recentlyArchivedCustomers, allArchivedCustomers, unarchiveCustomer, scrubCustomerData, weeklyEarnings, customers, profile, refetchAll, upcomingJobs, assignedJobs, teamMemberships } = useSupabaseData();
  const { signOut, deleteAccount } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncPendingMutations } = useOffline();
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const { isSupported: notificationsSupported, isEnabled: notificationsEnabled, requestPermission, disableNotifications } = useNotifications();
  const { theme, setTheme } = useTheme();
  const [isEditBusinessNameOpen, setIsEditBusinessNameOpen] = useState(false);
  const [isEditGoogleReviewLinkOpen, setIsEditGoogleReviewLinkOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [priceWizardOpen, setPriceWizardOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDataExportOpen, setIsDataExportOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { showTour, completeTour, resetTour } = useWelcomeTour();

  // Load last synced timestamp
  useEffect(() => {
    setLastSynced(syncStatus.getLastSynced());
  }, [isSyncing]); // Refresh when sync completes

  // Handle subscription callback from Stripe
  useEffect(() => {
    const subscription = searchParams.get('subscription');
    if (subscription === 'success') {
      console.log('✅ Payment confirmed: Stripe checkout successful');
      
      // Force refresh subscription status immediately and again after a delay
      checkSubscription();
      setTimeout(() => {
        checkSubscription();
      }, 2000);
      
      toast({
        title: "🎉 Subscription activated!",
        description: "Your free trial has started. Enjoy all premium features - you won't be charged until your trial ends.",
        duration: 6000,
      });
      setSearchParams({});
    } else if (subscription === 'cancelled') {
      console.log('⚠️ Stripe checkout cancelled by user');
      toast({
        title: "Checkout cancelled",
        description: "No worries! You can subscribe anytime from Settings. Your free jobs are still available.",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, checkSubscription, setSearchParams]);

  // Note: GoCardless callback handling has been moved to dedicated /gocardless-callback route
  // This ensures persistent handshake survives redirects using localStorage

  const formatLastSynced = () => {
    if (!lastSynced) return 'Never';
    const date = new Date(lastSynced);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return format(date, 'd MMM yyyy');
  };

  const handleSignOut = async () => {
    // signOut() now handles the redirect internally
    await signOut();
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        toast({
          title: 'Failed to delete account',
          description: error.message || 'An error occurred while deleting your account. Please contact support.',
          variant: 'destructive',
        });
        setIsDeletingAccount(false);
        setIsDeleteAccountOpen(false);
      }
      // If successful, deleteAccount will redirect to /auth
    } catch (err) {
      console.error('[Settings] Error deleting account:', err);
      toast({
        title: 'Failed to delete account',
        description: err instanceof Error ? err.message : 'An unexpected error occurred. Please contact support.',
        variant: 'destructive',
      });
      setIsDeletingAccount(false);
      setIsDeleteAccountOpen(false);
    }
  };

  const handleRestore = async (customerId: string) => {
    setRestoringId(customerId);
    try {
      await unarchiveCustomer(customerId);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePrivacyScrubClick = async (customer: { id: string; name: string }) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handlePrivacyScrub = async () => {
    if (!customerToDelete) return;
    
    const customerId = customerToDelete.id;
    setDeletingId(customerId);
    
    try {
      await scrubCustomerData(customerId);
      // Only close modal on success
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('[Settings] Error scrubbing customer data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scrub customer data. Please try again.';
      
      // Show error toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Reset deleting state but keep modal open so user can see the error
      setDeletingId(null);
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 mb-6">
            <TabsTrigger value="settings" className="text-sm">
              Settings
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Archived Customers
              {allArchivedCustomers.length > 0 && (
                <span className="px-1.5 py-0.5 bg-muted rounded-full text-xs font-medium">
                  {allArchivedCustomers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Financial Card */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financial</h3>
                
                {/* Business Insights */}
                <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <BarChart3 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="flex-1 font-medium text-foreground">Business Insights</span>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", insightsOpen && "rotate-90")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 pb-32">
                    <BusinessInsights 
                      weeklyEarnings={weeklyEarnings} 
                      customerCount={customers.length}
                      upcomingJobs={upcomingJobs}
                      profile={profile}
                      onUpdateProfile={refetchAll}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Price Increase Wizard */}
                <Collapsible open={priceWizardOpen} onOpenChange={setPriceWizardOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="flex-1 font-medium text-foreground">Price Increase Wizard</span>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", priceWizardOpen && "rotate-90")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <PriceIncreaseWizard 
                      customers={customers}
                      businessName={businessName || 'Your Business'}
                      onUpdateComplete={refetchAll}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Subscription Section - Only show for owners, not helpers */}
                {(() => {
                  // Determine if user is owner or helper
                  // Owner: has customers
                  // Helper: has assigned jobs OR is in team_members (even if no current assignments)
                  const isOwner = customers.length > 0;
                  const isHelper = assignedJobs.length > 0 || (teamMemberships?.length ?? 0) > 0;
                  
                  // Only show subscription section for owners
                  if (!isOwner && isHelper) {
                    return null;
                  }
                  
                  return (
                    <div className="pt-2 border-t border-border">
                      <SubscriptionSection />
                    </div>
                  );
                })()}

                {/* GoCardless Section */}
                <div className="pt-2 border-t border-border">
                  <GoCardlessSection profile={profile} onRefresh={refetchAll} />
                </div>

                {/* Earnings Report */}
                <button
                  onClick={() => navigate('/earnings')}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="flex-1 font-medium text-foreground">Earnings & Stats</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Export to Xero */}
                <button
                  onClick={() => setIsExportOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Export for Xero</p>
                    <p className="text-xs text-muted-foreground">Accountant Export</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Account Card */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</h3>
                
                {/* Business Name */}
                <button
                  onClick={() => setIsEditBusinessNameOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <Building className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{businessName}</p>
                    <p className="text-xs text-muted-foreground">Business Name</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Google Review Link */}
                <button
                  onClick={() => setIsEditGoogleReviewLinkOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {profile?.google_review_link ? 'Link configured ✓' : 'Not set up'}
                    </p>
                    <p className="text-xs text-muted-foreground">Google Reviews</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Email - Not clickable */}
                <div className="flex items-center gap-3 py-2">
                  <User className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{userEmail}</p>
                    <p className="text-xs text-muted-foreground">Account</p>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ThemeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">{getThemeLabel()}</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => {
                      setTheme(checked ? 'dark' : 'light');
                    }}
                  />
                </div>

                {/* Notifications Toggle */}
                {notificationsSupported && (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-action-green flex-shrink-0" />
                      ) : (
                        <BellOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Job Reminders</p>
                        <p className="text-xs text-muted-foreground">
                          {notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          requestPermission();
                        } else {
                          disableNotifications();
                        }
                      }}
                    />
                  </div>
                )}

                {/* SMS Templates */}
                <button
                  onClick={() => navigate('/settings/sms-templates')}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">SMS Templates</p>
                    <p className="text-xs text-muted-foreground">Customize message templates</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Install App Card - Prominent placement */}
              {!isInstalled ? (() => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isAndroid = /Android/.test(navigator.userAgent);
                
                return (
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl border-2 border-primary/20 shadow-lg p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          Install SoloWipe
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {canInstall 
                            ? "Click below to add SoloWipe to your home screen instantly"
                            : isIOS
                            ? "Follow the guide to add SoloWipe to your iPhone or iPad home screen"
                            : isAndroid
                            ? "Add SoloWipe to your Android home screen for quick access"
                            : "Add to your home screen for quick access and a better experience"
                          }
                        </p>
                        {canInstall ? (
                          <Button
                            onClick={async () => {
                              const success = await promptInstall();
                              if (success) {
                                toast({
                                  title: "App installed!",
                                  description: "SoloWipe has been added to your home screen.",
                                });
                              } else {
                                toast({
                                  title: "Installation cancelled",
                                  description: "You can install later from your browser menu.",
                                  variant: "default",
                                });
                              }
                            }}
                            className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-base font-semibold shadow-sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Install Now
                          </Button>
                        ) : (
                          <Button
                            onClick={() => navigate('/install')}
                            variant="outline"
                            className="w-full h-11 rounded-lg border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/40"
                          >
                            View Installation Guide
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-0.5">Benefits:</p>
                        <p>Works offline • Faster access • Home screen icon • Native feel</p>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="bg-gradient-to-br from-action-green/10 via-action-green/5 to-background rounded-xl border-2 border-action-green/20 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-action-green/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-action-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">App Installed</p>
                      <p className="text-xs text-muted-foreground">SoloWipe is available on your home screen</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Support Card */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Support</h3>

                {/* Sync Status */}
                <div className="flex items-center gap-3 py-2">
                  <Cloud className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{formatLastSynced()}</p>
                    <p className="text-xs text-muted-foreground">Last Synced</p>
                  </div>
                </div>

                {/* Sync Now Button - Show when there are pending changes */}
                {pendingCount > 0 && (
                  <button
                    onClick={() => syncPendingMutations()}
                    disabled={!isOnline || isSyncing}
                    className={cn(
                      "w-full flex items-center gap-3 text-left py-2",
                      "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isOnline ? (
                      <RefreshCw className={cn("w-4 h-4 text-amber-500 flex-shrink-0", isSyncing && "animate-spin")} />
                    ) : (
                      <CloudOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {isSyncing ? 'Syncing...' : isOnline ? 'Sync Now' : 'Waiting for signal...'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {isOnline && !isSyncing && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}

                {/* Replay Tour Button */}
                <button
                  onClick={resetTour}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <RotateCcw className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Replay App Tour</p>
                    <p className="text-xs text-muted-foreground">Need a refresher?</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Help & Support */}
                <button
                  onClick={() => setIsHelpOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left py-2",
                    "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                  )}
                >
                  <MessageCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Help & Support</p>
                    <p className="text-xs text-muted-foreground">Questions?</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Data Management Collapsible */}
                <Collapsible open={isDataManagementOpen} onOpenChange={setIsDataManagementOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <Database className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Data Management</p>
                        <p className="text-xs text-muted-foreground">Export & Archive</p>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isDataManagementOpen && "rotate-90")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 pl-7 border-l-2 border-border ml-2">
                    {/* Export All Data */}
                    <button
                      onClick={() => setIsDataExportOpen(true)}
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <FileJson className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Export All Data</p>
                        <p className="text-xs text-muted-foreground">Your Data</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Get Import Help */}
                    <button
                      onClick={() => window.location.href = 'mailto:aaron@solowipe.co.uk?subject=Help me import my customers'}
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Get Import Help</p>
                        <p className="text-xs text-muted-foreground">We can import for you</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Archived Customers - Navigate to tab */}
                    <button
                      onClick={() => {
                        const tabs = document.querySelector('[role="tablist"]');
                        const archivedTab = tabs?.querySelector('[value="archived"]') as HTMLElement;
                        archivedTab?.click();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 text-left py-2",
                        "hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-lg"
                      )}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Archived Customers</p>
                        <p className="text-xs text-muted-foreground">
                          {allArchivedCustomers.length > 0 ? `${allArchivedCustomers.length} archived` : 'None archived'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Danger Zone</h3>
                
                {/* Delete Account */}
                <button
                  onClick={() => setIsDeleteAccountOpen(true)}
                  disabled={isDeletingAccount}
                  className="w-full text-center text-sm text-destructive hover:underline py-2 disabled:opacity-50"
                >
                  {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                </button>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="w-full text-center text-sm text-destructive hover:underline py-2 mt-2"
                >
                  Sign Out
                </button>
              </div>

              {/* App Version - Tiny centered text */}
              <div className="text-center pt-2 pb-4">
                <p className="text-[10px] text-muted-foreground/60">
                  SoloWipe v1.3.0 • Build {__BUILD_DATE__}
                </p>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="archived" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {allArchivedCustomers.length === 0 ? (
                <EmptyState
                  icon={<Trash2 className="w-12 h-12 text-muted-foreground" />}
                  title="No archived customers"
                  description="When you archive a customer, they'll appear here."
                />
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {allArchivedCustomers.map((customer) => {
                      const isRecent = recentlyArchivedCustomers.some(c => c.id === customer.id);
                      return (
                        <motion.div
                          key={customer.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={cn(
                            "bg-card rounded-xl border shadow-sm p-4",
                            isRecent ? "border-warning/50" : "border-border"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3" style={{ writingMode: 'horizontal-tb', direction: 'ltr' }}>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 mb-1 min-w-0 flex-wrap" style={{ writingMode: 'horizontal-tb' }}>
                                <h3 
                                  className="font-bold text-foreground text-lg leading-tight break-words min-w-0 flex-1 whitespace-normal" 
                                  style={{ 
                                    wordBreak: 'break-word', 
                                    overflowWrap: 'break-word', 
                                    writingMode: 'horizontal-tb',
                                    textOrientation: 'mixed',
                                    direction: 'ltr',
                                    display: 'block',
                                    width: '100%'
                                  }}
                                >
                                  {customer.name || 'Unknown Customer'}
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isRecent && (
                                    <span className="text-xs px-1.5 py-0.5 bg-warning/15 dark:bg-warning/25 text-warning dark:text-warning rounded font-semibold border border-warning/30 dark:border-warning/40 whitespace-nowrap">
                                      Recent
                                    </span>
                                  )}
                                  {customer.is_scrubbed && (
                                    <span className="text-xs px-1.5 py-0.5 bg-destructive/10 text-destructive rounded whitespace-nowrap">
                                      Scrubbed
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                {customer.is_scrubbed ? 'Contact details removed for privacy' : customer.address || 'No address'}
                              </p>
                              {customer.archived_at && (
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  Archived {format(new Date(customer.archived_at), 'd MMM yyyy')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(customer.id)}
                                disabled={restoringId === customer.id || deletingId === customer.id}
                                className="gap-1.5"
                              >
                                <RotateCcw className="w-4 h-4" />
                                {restoringId === customer.id ? 'Restoring...' : 'Restore'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handlePrivacyScrubClick({ id: customer.id, name: customer.name })}
                                disabled={restoringId === customer.id || deletingId === customer.id}
                                className="gap-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                                {deletingId === customer.id ? 'Scrubbing...' : 'Hard Archive'}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

          {/* Privacy Scrub (Hard Archive) Confirmation Dialog */}
          <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmOpen(false);
            }
          }}>
            <AlertDialogContent className="bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Hard Archive (Scrub Data)?
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2">
                  <p className="mb-3">
                    This will permanently remove <strong>{customerToDelete?.name}</strong>'s contact details and address for privacy compliance, but will keep their name in your financial records for accounting.
                  </p>
                  <p className="mb-3 font-semibold text-foreground">
                    What will happen:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm mb-3">
                    <li>Address, phone, email, and notes will be removed</li>
                    <li>Customer name will remain in financial reports</li>
                    <li>Any pending or future jobs will be deleted</li>
                    <li>Completed job history and payments will be preserved</li>
                  </ul>
                  <p className="mt-3 font-semibold text-destructive">
                    This action cannot be undone.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={!!deletingId}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handlePrivacyScrub}
                  disabled={!!deletingId}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingId ? 'Scrubbing...' : 'Proceed'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Account Confirmation Dialog */}
          <AlertDialog open={isDeleteAccountOpen} onOpenChange={(open) => {
            if (!open && !isDeletingAccount) {
              setIsDeleteAccountOpen(false);
            }
          }}>
            <AlertDialogContent className="bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Delete Account?
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2">
                  <p className="mb-3">
                    This will <strong>permanently delete</strong> your SoloWipe account and all associated data.
                  </p>
                  <p className="mb-3 font-semibold text-foreground">
                    What will be deleted:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm mb-3">
                    <li>Your profile and business information</li>
                    <li>All customers and their data</li>
                    <li>All jobs and job history</li>
                    <li>All photos and files</li>
                    <li>Your subscription (if active)</li>
                    <li>GoCardless connection (if connected)</li>
                  </ul>
                  <p className="mb-3 text-sm text-muted-foreground">
                    <strong>Before deleting:</strong> Consider exporting your data first using the "Export All Data" option above.
                  </p>
                  <p className="mt-3 font-semibold text-destructive">
                    ⚠️ This action cannot be undone. All your data will be permanently lost.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAccount}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </main>

      {/* Edit Business Name Modal */}
      <EditBusinessNameModal
        isOpen={isEditBusinessNameOpen}
        currentName={businessName}
        onClose={() => setIsEditBusinessNameOpen(false)}
        onSubmit={updateBusinessName}
      />

      {/* Export Earnings Modal */}
      <ExportEarningsModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        businessName={businessName}
      />

      {/* Edit Google Review Link Modal */}
      <EditGoogleReviewLinkModal
        isOpen={isEditGoogleReviewLinkOpen}
        currentLink={profile?.google_review_link || null}
        onClose={() => setIsEditGoogleReviewLinkOpen(false)}
        onSubmit={updateGoogleReviewLink}
      />

      {/* Welcome Tour */}
      {showTour && <WelcomeTour onComplete={completeTour} />}

      {/* Help Section */}
      <HelpSection isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Data Export Modal */}
      <DataExportModal isOpen={isDataExportOpen} onClose={() => setIsDataExportOpen(false)} />
    </div>
  );
};

export default Settings;
