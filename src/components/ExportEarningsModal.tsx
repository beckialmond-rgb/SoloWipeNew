import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Download, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { downloadCSV } from '@/utils/exportCSV';
import { exportJobsToXero } from '@/services/csv';
import { Customer, JobWithCustomer } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface ExportEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
}

const dateRangeOptions = [
  { value: '1', label: 'Last Month' },
  { value: '3', label: 'Last 3 Months' },
  { value: '6', label: 'Last 6 Months' },
  { value: '12', label: 'Last 12 Months' },
];

export function ExportEarningsModal({ isOpen, onClose, businessName }: ExportEarningsModalProps) {
  const [selectedRange, setSelectedRange] = useState('3');
  const [isExporting, setIsExporting] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const months = parseInt(selectedRange);
      const startDate = format(startOfMonth(subMonths(new Date(), months)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'completed')
        .gte('completed_at', `${startDate}T00:00:00`)
        .lte('completed_at', `${endDate}T23:59:59`)
        .order('completed_at', { ascending: true });
      
      const { data, error } = await query;

      if (error) throw error;

      // Map and filter jobs
      let jobs = (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];

      // Filter out archived customers if toggle is off (post-processing)
      // This is necessary because Supabase query builder doesn't support filtering on joined table fields
      // Note: exportJobsToXero doesn't filter archived, so we filter before calling
      if (!includeArchived) {
        jobs = jobs.filter(job => !job.customer?.is_archived);
      }

      if (jobs.length === 0) {
        toast({
          title: 'No data to export',
          description: 'No completed jobs found for the selected period.',
          variant: 'destructive',
        });
        return;
      }

      // Use centralized CSV service for Xero export
      const csvContent = exportJobsToXero(jobs, 'Service');
      
      // Generate filename
      const rangeLabel = `${format(new Date(startDate), 'MMM_yyyy')}_to_${format(new Date(endDate), 'MMM_yyyy')}`;
      const sanitizedBusinessName = businessName.replace(/\s+/g, '_');
      const filename = `${sanitizedBusinessName}_Earnings_${rangeLabel}.csv`;
      
      // Download CSV
      downloadCSV(csvContent, filename);

      toast({
        title: 'Export complete!',
        description: `Exported ${jobs.length} jobs to CSV.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Export Earnings Report</DialogTitle>
          <DialogDescription>
            Download a CSV file of your completed jobs. Compatible with Xero and other accounting software.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Date Range
            </label>
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-full h-12">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="include-archived" className="text-sm font-medium text-foreground cursor-pointer">
                  Include Archived Customers
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Include jobs from archived customers for complete financial reporting
                </p>
              </div>
              <Switch
                id="include-archived"
                checked={includeArchived}
                onCheckedChange={setIncludeArchived}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>The export will include:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Customer name and address</li>
                <li>Invoice number and date</li>
                <li>Amount and payment status</li>
                {includeArchived && (
                  <li className="font-medium text-foreground">Jobs from archived customers</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Buttons - Sticky at bottom */}
        <div className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Download CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
