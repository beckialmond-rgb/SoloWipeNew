import { motion } from 'framer-motion';
import { Share, Plus, MoreVertical, Download, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';

const Install = () => {
  const navigate = useNavigate();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      navigate('/');
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-action-green/10 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-action-green" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">App Installed!</h1>
        <p className="text-muted-foreground text-center mb-8">
          SoloWipe is ready to use from your home screen.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="h-14 px-8 rounded-xl bg-primary hover:bg-primary/90"
        >
          Open App
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <img
            src="/logo.png"
            alt="SoloWipe"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Install SoloWipe
          </h1>
          <p className="text-muted-foreground">
            Add to your home screen for the best experience
          </p>
        </div>

        {/* iOS Instructions */}
        {isIOS && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-6 text-center">
                Follow these steps:
              </h2>
              
              {/* Step 1 */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    Tap the Share button
                  </p>
                  <div className="bg-muted rounded-lg p-3 flex items-center justify-center">
                    <Share className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Located at the bottom of Safari
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    Tap "Add to Home Screen"
                  </p>
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                      <Plus className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-foreground">Add to Home Screen</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Scroll down in the share menu to find it
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              The app will appear on your home screen like a native app
            </p>
          </motion.div>
        )}

        {/* Android/Desktop with Install Prompt */}
        {!isIOS && canInstall && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground mb-2">
                Ready to Install
              </h2>
              <p className="text-muted-foreground mb-6">
                Click below to add SoloWipe to your home screen
              </p>
              <Button
                onClick={handleInstall}
                className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-lg font-semibold"
              >
                Install App
              </Button>
            </div>
          </motion.div>
        )}

        {/* Android/Desktop without Install Prompt */}
        {!isIOS && !canInstall && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-6 text-center">
                {isAndroid ? 'Install from Chrome menu:' : 'Install from browser menu:'}
              </h2>

              {/* Step 1 */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    Tap the menu button
                  </p>
                  <div className="bg-muted rounded-lg p-3 flex items-center justify-center">
                    <MoreVertical className="w-8 h-8 text-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Three dots in the top right corner
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">
                    Tap "Install app" or "Add to Home screen"
                  </p>
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                    <Download className="w-6 h-6 text-foreground" />
                    <span className="text-foreground">Install app</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
          >
            Back to app
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Install;
