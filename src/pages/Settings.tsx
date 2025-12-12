import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, LogOut, ChevronRight, Download, FileSpreadsheet, Moon, Sun, Monitor, TrendingUp, Trash2, RotateCcw, Link as LinkIcon, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EditBusinessNameModal } from '@/components/EditBusinessNameModal';
import { ExportEarningsModal } from '@/components/ExportEarningsModal';
import { BusinessInsights } from '@/components/BusinessInsights';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Settings = () => {
  const { businessName, userEmail, updateBusinessName, recentlyArchivedCustomers, unarchiveCustomer, weeklyEarnings, customers } = useSupabaseData();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstalled } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const [isEditBusinessNameOpen, setIsEditBusinessNameOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

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
        <p className="text-center text-xs text-muted-foreground mt-12">
          SoloWipe v1.1.0
        </p>
      </main>

      <BottomNav />

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
    </div>
  );
};

export default Settings;
