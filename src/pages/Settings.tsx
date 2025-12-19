import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, LogOut, ChevronRight, Download, FileSpreadsheet, Moon, Sun, Monitor, TrendingUp, Trash2, RotateCcw, Link as LinkIcon, BarChart3, Star, HelpCircle, Bell, BellOff, RefreshCw, CloudOff, Cloud, FileJson, MessageCircle } from 'lucide-react';
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
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useNotifications } from '@/hooks/useNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { businessName, userEmail, updateBusinessName, updateGoogleReviewLink, recentlyArchivedCustomers, unarchiveCustomer, weeklyEarnings, customers, profile, refetchAll } = useSupabaseData();
  const { signOut } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncPendingMutations } = useOffline();
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isInstalled } = useInstallPrompt();
  const { isSupported: notificationsSupported, isEnabled: notificationsEnabled, requestPermission, disableNotifications } = useNotifications();
  const { theme, setTheme } = useTheme();
  const [isEditBusinessNameOpen, setIsEditBusinessNameOpen] = useState(false);
  const [isEditGoogleReviewLinkOpen, setIsEditGoogleReviewLinkOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDataExportOpen, setIsDataExportOpen] = useState(false);
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
      toast({
        title: "Subscription activated!",
        description: "Welcome to SoloWipe Pro. Enjoy all premium features.",
      });
      checkSubscription();
      setSearchParams({});
    } else if (subscription === 'cancelled') {
      console.log('⚠️ Stripe checkout cancelled by user');
      toast({
        title: "Subscription cancelled",
        description: "You can subscribe anytime to unlock Pro features.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, checkSubscription, setSearchParams]);

  // Use state instead of ref to prevent double-execution and track processing status
  const [processingCallback, setProcessingCallback] = useState(false);

  // Handle GoCardless OAuth callback
  useEffect(() => {
    const gocardless = searchParams.get('gocardless');
    const code = searchParams.get('code');
    
    // Guard against multiple executions using state
    if (gocardless === 'callback' && code && !processingCallback) {
      setProcessingCallback(true);
      
      // Clear URL params immediately to prevent re-triggers
      setSearchParams({});
      
      const handleCallback = async () => {
        const redirectUrl = localStorage.getItem('gocardless_redirect_url');
        
        console.log('[Settings] Starting GoCardless callback');
        console.log('[Settings] Code:', code?.substring(0, 10) + '...');
        console.log('[Settings] RedirectUrl:', redirectUrl);
        
        try {
          const { data, error } = await supabase.functions.invoke('gocardless-callback', {
            body: { code, redirectUrl },
          });

          console.log('[Settings] Callback response:', { data, error });

          if (error) throw error;

          console.log('[Settings] Success! Refreshing data...');
          toast({
            title: "GoCardless connected!",
            description: "You can now set up Direct Debits for your customers.",
          });
          await refetchAll();
          console.log('[Settings] Data refreshed');
        } catch (error) {
          console.error('GoCardless callback error:', error);
          toast({
            title: "Connection failed",
            description: "Failed to connect GoCardless. Please try again.",
            variant: "destructive",
          });
        } finally {
          localStorage.removeItem('gocardless_state');
          localStorage.removeItem('gocardless_redirect_url');
          setProcessingCallback(false);
        }
      };
      
      // Add timeout to prevent indefinite processing state
      const timeoutId = setTimeout(() => {
        if (processingCallback) {
          console.warn('[Settings] GoCardless callback timeout - resetting state');
          setProcessingCallback(false);
        }
      }, 30000); // 30 second timeout
      
      handleCallback();
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, setSearchParams, toast, refetchAll, processingCallback]);

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
    await signOut();
    navigate('/auth');
  };

  const handleRestore = async (customerId: string) => {
    setRestoringId(customerId);
    try {
      await unarchiveCustomer(customerId);
    } finally {
      setRestoringId(null);
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
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Business Insights Collapsible */}
          <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
            <CollapsibleTrigger asChild>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "w-full bg-card rounded-xl border border-border p-4",
                  "flex items-center gap-4 text-left",
                  "hover:bg-muted/50 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Business</p>
                  <p className="font-medium text-foreground">Insights & Stats</p>
                </div>

                <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform", insightsOpen && "rotate-90")} />
              </motion.button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <BusinessInsights 
                weeklyEarnings={weeklyEarnings} 
                customerCount={customers.length}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Subscription Section */}
          <SubscriptionSection />

          {/* GoCardless Section */}
          <GoCardlessSection profile={profile} onRefresh={refetchAll} />

          {/* Business Name - Clickable */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => setIsEditBusinessNameOpen(true)}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-medium text-foreground truncate">{businessName}</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Google Review Link */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            onClick={() => setIsEditGoogleReviewLinkOpen(true)}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Google Reviews</p>
              <p className="font-medium text-foreground truncate">
                {profile?.google_review_link ? 'Link configured ✓' : 'Not set up'}
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Account - Not clickable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Account</p>
              <p className="font-medium text-foreground truncate">{userEmail}</p>
            </div>
          </motion.div>

          {/* Theme Toggle */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            onClick={cycleTheme}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ThemeIcon className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Appearance</p>
              <p className="font-medium text-foreground">{getThemeLabel()}</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Notifications Toggle */}
          {notificationsSupported && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              onClick={() => notificationsEnabled ? disableNotifications() : requestPermission()}
              className={cn(
                "w-full bg-card rounded-xl border border-border p-4",
                "flex items-center gap-4 text-left",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                notificationsEnabled ? "bg-action-green/10" : "bg-muted"
              )}>
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-action-green" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Job Reminders</p>
                <p className="font-medium text-foreground">
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* Earnings Report */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('/earnings')}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Reports</p>
              <p className="font-medium text-foreground">Earnings & Stats</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Export to Xero */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setIsExportOpen(true)}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Accountant Export</p>
              <p className="font-medium text-foreground">Export for Xero</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Install App - Only show if not installed */}
          {!isInstalled && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/install')}
              className={cn(
                "w-full bg-card rounded-xl border border-border p-4",
                "flex items-center gap-4 text-left",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Get the App</p>
                <p className="font-medium text-foreground">Install on Home Screen</p>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* Sync Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Last Synced</p>
              <p className="font-medium text-foreground">{formatLastSynced()}</p>
            </div>
          </motion.div>

          {/* Sync Now Button - Show when there are pending changes */}
          {pendingCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              onClick={() => syncPendingMutations()}
              disabled={!isOnline || isSyncing}
              className={cn(
                "w-full bg-card rounded-xl border border-border p-4",
                "flex items-center gap-4 text-left",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isOnline ? "bg-amber-500/10" : "bg-muted"
              )}>
                {isOnline ? (
                  <RefreshCw className={cn("w-5 h-5 text-amber-500", isSyncing && "animate-spin")} />
                ) : (
                  <CloudOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="font-medium text-foreground">
                  {isSyncing ? 'Syncing...' : isOnline ? 'Sync Now' : 'Waiting for signal...'}
                </p>
              </div>

              {isOnline && !isSyncing && (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.button>
          )}

          {/* Replay Tour Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={resetTour}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Need a refresher?</p>
              <p className="font-medium text-foreground">Replay App Tour</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Help & Support */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            onClick={() => setIsHelpOpen(true)}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Questions?</p>
              <p className="font-medium text-foreground">Help & Support</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Export My Data */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
            onClick={() => setIsDataExportOpen(true)}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-purple-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Your Data</p>
              <p className="font-medium text-foreground">Export All Data</p>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>


          {/* Recently Deleted Section */}
          {recentlyArchivedCustomers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Recently Deleted</h3>
                <span className="text-xs text-muted-foreground/70">(expires after 7 days)</span>
              </div>
              
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {recentlyArchivedCustomers.map((customer) => (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-card rounded-xl border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{customer.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                          {customer.archived_at && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Deleted {format(new Date(customer.archived_at), 'd MMM')}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(customer.id)}
                          disabled={restoringId === customer.id}
                          className="gap-1.5 shrink-0"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {restoringId === customer.id ? 'Restoring...' : 'Restore'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Sign Out Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleSignOut}
            className={cn(
              "w-full bg-card rounded-xl border border-border p-4 mt-8",
              "flex items-center gap-4 text-left",
              "hover:bg-destructive/10 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            
            <span className="font-medium text-destructive">Sign Out</span>
          </motion.button>
        </motion.div>

        {/* App Version */}
        <div className="text-center mt-12 space-y-1">
          <p className="text-xs text-muted-foreground">
            SoloWipe v1.3.0
          </p>
          <p className="text-xs text-muted-foreground/60">
            Build {__BUILD_DATE__}
          </p>
        </div>
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
