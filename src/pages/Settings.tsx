import { motion } from 'framer-motion';
import { User, Building, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { businessName, userEmail } = useSupabaseData();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const settingsItems = [
    {
      icon: Building,
      label: 'Business Name',
      value: businessName,
      onClick: () => {},
    },
    {
      icon: User,
      label: 'Account',
      value: userEmail,
      onClick: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {settingsItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={item.onClick}
              className={cn(
                "w-full bg-card rounded-xl border border-border p-4",
                "flex items-center gap-4 text-left",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium text-foreground truncate">{item.value}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}

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
    </div>
  );
};

export default Settings;
