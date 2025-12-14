import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, FileJson, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataExportModal = React.forwardRef<HTMLDivElement, DataExportModalProps>(
  ({ isOpen, onClose }, ref) => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportComplete(false);

    try {
      // Fetch all user data
      const [profileResult, customersResult, jobsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('customers').select('*').eq('profile_id', user.id),
        supabase.from('jobs').select('*, customers!inner(profile_id)').eq('customers.profile_id', user.id),
      ]);

      if (profileResult.error) throw profileResult.error;

      // Prepare export data
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profileResult.data,
        customers: customersResult.data || [],
        jobs: (jobsResult.data || []).map((job: Record<string, unknown>) => {
          // Remove the nested customers object from jobs
          const { customers, ...jobData } = job;
          return jobData;
        }),
        statistics: {
          totalCustomers: customersResult.data?.length || 0,
          totalJobs: jobsResult.data?.length || 0,
          completedJobs: jobsResult.data?.filter((j: Record<string, unknown>) => j.status === 'completed').length || 0,
          totalEarnings: jobsResult.data?.reduce((sum: number, j: Record<string, unknown>) => 
            sum + ((j.amount_collected as number) || 0), 0) || 0,
        },
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solowipe-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      toast({
        title: 'Export complete',
        description: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Export Your Data</h2>
                  <p className="text-sm text-muted-foreground">GDPR compliant data export</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className="bg-muted/30 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-foreground mb-2">What's included:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your profile information</li>
                  <li>• All customer records</li>
                  <li>• Complete job history</li>
                  <li>• Payment records</li>
                  <li>• Usage statistics</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Your data will be downloaded as a JSON file that you can open with any text editor or import into other applications.
              </p>

              {exportComplete ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-3" />
                  </motion.div>
                  <p className="text-lg font-medium text-foreground">Export Complete!</p>
                  <p className="text-sm text-muted-foreground">Check your downloads folder.</p>
                </div>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full min-h-[48px]"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download My Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

DataExportModal.displayName = 'DataExportModal';

export default DataExportModal;
