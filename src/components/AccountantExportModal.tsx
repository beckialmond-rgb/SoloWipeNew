import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Download, Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AccountantExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DateRangePreset = '30' | '90' | 'custom';

export function AccountantExportModal({ isOpen, onClose }: AccountantExportModalProps) {
  const [preset, setPreset] = useState<DateRangePreset>('30');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range based on preset
  const getDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const endDate = format(endOfDay(today), 'yyyy-MM-dd');

    if (preset === 'custom') {
      return {
        startDate: customStartDate || format(subDays(today, 30), 'yyyy-MM-dd'),
        endDate: customEndDate || endDate,
      };
    }

    const days = parseInt(preset);
    const startDate = format(startOfDay(subDays(today, days)), 'yyyy-MM-dd');
    return { startDate, endDate };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { startDate, endDate } = getDateRange();

      // Validate dates
      if (!startDate || !endDate) {
        toast({
          title: 'Invalid date range',
          description: 'Please select a valid date range.',
          variant: 'destructive',
        });
        return;
      }

      if (new Date(endDate) < new Date(startDate)) {
        toast({
          title: 'Invalid date range',
          description: 'End date must be after start date.',
          variant: 'destructive',
        });
        return;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to export data.',
          variant: 'destructive',
        });
        return;
      }

      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Call export API directly with fetch to handle CSV response
      const response = await fetch(
        `${supabaseUrl}/functions/v1/export-accountant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ startDate, endDate }),
        }
      );

      if (!response.ok) {
        // Try to parse error JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Export failed: ${response.statusText}`);
        } else {
          const errorText = await response.text();
          throw new Error(errorText || `Export failed: ${response.statusText}`);
        }
      }

      // Get CSV content
      const csvContent = await response.text();
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = `accountant_export_${startDate}_to_${endDate}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete!',
        description: `Accountant export downloaded successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('[AccountantExport] Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export for Accountant</DialogTitle>
          <DialogDescription>
            Download a CSV file of completed jobs for your accountant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={preset === '30' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPreset('30')}
              >
                Last 30 days
              </Button>
              <Button
                type="button"
                variant={preset === '90' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPreset('90')}
              >
                Last 90 days
              </Button>
              <Button
                type="button"
                variant={preset === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPreset('custom')}
              >
                Custom
              </Button>
            </div>
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium">
                  From Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium">
                  To Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Export includes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Job ID, date, and customer details</li>
              <li>Payment status and method</li>
              <li>Helper assignments and payments</li>
              <li>Owner revenue calculations</li>
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

