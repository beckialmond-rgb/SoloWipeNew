import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Building, LogOut, ChevronRight, Download, FileSpreadsheet, Moon, Sun, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EditBusinessNameModal } from '@/components/EditBusinessNameModal';
import { ExportEarningsModal } from '@/components/ExportEarningsModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { businessName, userEmail, updateBusinessName } = useSupabaseData();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstalled } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const [isEditBusinessNameOpen, setIsEditBusinessNameOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
          {/* Business Name - Clickable */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
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

          {/* Export to Xero */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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
          SoloWipe v1.0.0
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
