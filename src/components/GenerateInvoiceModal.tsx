import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useHelperInvoices } from '@/hooks/useHelperInvoices';
import { Helper } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpers: Helper[];
}

export function GenerateInvoiceModal({ isOpen, onClose, helpers }: GenerateInvoiceModalProps) {
  const {
    generateInvoice,
    isGeneratingInvoice,
    getDefaultPeriodDates,
    getPreviousPeriodDates,
  } = useHelperInvoices();

  const [selectedHelperId, setSelectedHelperId] = useState<string>('');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly');
  const [periodOption, setPeriodOption] = useState<'current' | 'previous' | 'custom'>('previous');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Get period dates based on selection
  const getPeriodDates = (): { start: Date; end: Date } => {
    if (periodOption === 'current') {
      return getDefaultPeriodDates(periodType);
    } else if (periodOption === 'previous') {
      return getPreviousPeriodDates(periodType);
    } else {
      // Custom dates
      if (customStartDate && customEndDate) {
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
        };
      }
      // Fallback to previous period
      return getPreviousPeriodDates(periodType);
    }
  };

  const handleGenerate = async () => {
    if (!selectedHelperId) return;

    const { start, end } = getPeriodDates();

    try {
      await generateInvoice({
        helperId: selectedHelperId,
        periodType,
        periodStart: start,
        periodEnd: end,
      });
      onClose();
      // Reset form
      setSelectedHelperId('');
      setPeriodType('monthly');
      setPeriodOption('previous');
      setCustomStartDate('');
      setCustomEndDate('');
    } catch (error) {
      // Error handled by hook
    }
  };

  const canGenerate = selectedHelperId && (periodOption !== 'custom' || (customStartDate && customEndDate));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Helper Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a helper based on completed jobs in a specific period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Helper Selection */}
          <div className="space-y-2">
            <Label htmlFor="helper">Helper</Label>
            <Select value={selectedHelperId} onValueChange={setSelectedHelperId}>
              <SelectTrigger id="helper">
                <SelectValue placeholder="Select a helper" />
              </SelectTrigger>
              <SelectContent>
                {helpers.map(helper => (
                  <SelectItem key={helper.id} value={helper.id}>
                    {helper.name || helper.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Type */}
          <div className="space-y-2">
            <Label htmlFor="periodType">Period Type</Label>
            <Select value={periodType} onValueChange={(value: 'weekly' | 'monthly') => setPeriodType(value)}>
              <SelectTrigger id="periodType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label htmlFor="periodOption">Period</Label>
            <Select value={periodOption} onValueChange={(value: 'current' | 'previous' | 'custom') => setPeriodOption(value)}>
              <SelectTrigger id="periodOption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current {periodType === 'weekly' ? 'Week' : 'Month'}</SelectItem>
                <SelectItem value="previous">Previous {periodType === 'weekly' ? 'Week' : 'Month'}</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {periodOption === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Period Preview */}
          {periodOption !== 'custom' && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Period:{' '}
                <span className="font-medium text-foreground">
                  {format(getPeriodDates().start, 'dd/MM/yyyy')} -{' '}
                  {format(getPeriodDates().end, 'dd/MM/yyyy')}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingInvoice}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || isGeneratingInvoice}>
            {isGeneratingInvoice && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

