import { useState } from 'react';
import { format } from 'date-fns';
import { FileSpreadsheet, Download, Loader2, Calendar, AlertTriangle, Users, PoundSterling } from 'lucide-react';
import { useBillingExport, DateRangePreset } from '@/hooks/useBillingExport';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';

const dateRangePresets: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom range' },
];

export function BillingExport() {
  const {
    rows,
    exportCSV,
    exportExcel,
    isGenerating,
    error,
    summary,
    dateRange,
    setDateRange,
    isValidRange,
  } = useBillingExport();

  const [customStartOpen, setCustomStartOpen] = useState(false);
  const [customEndOpen, setCustomEndOpen] = useState(false);

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      // Initialize custom dates to this month if not set
      if (!dateRange.startDate || !dateRange.endDate) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange('custom', start, end);
      } else {
        setDateRange('custom', dateRange.startDate, dateRange.endDate);
      }
    } else {
      setDateRange(preset);
    }
  };

  const handleCustomStartSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange('custom', date, dateRange.endDate || undefined);
      setCustomStartOpen(false);
    }
  };

  const handleCustomEndSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange('custom', dateRange.startDate || undefined, date);
      setCustomEndOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Date Range</label>
        
        <Select value={dateRange.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full h-12">
            <Calendar className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangePresets.map(preset => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Pickers */}
        {dateRange.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Popover open={customStartOpen} onOpenChange={setCustomStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !dateRange.startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-5 w-5 flex-shrink-0" />
                    {dateRange.startDate ? format(dateRange.startDate, 'd MMM yyyy') : 'Pick start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.startDate || undefined}
                    onSelect={handleCustomStartSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">End Date</label>
              <Popover open={customEndOpen} onOpenChange={setCustomEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !dateRange.endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-5 w-5 flex-shrink-0" />
                    {dateRange.endDate ? format(dateRange.endDate, 'd MMM yyyy') : 'Pick end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.endDate || undefined}
                    onSelect={handleCustomEndSelect}
                    initialFocus
                    disabled={(date) => dateRange.startDate ? date < dateRange.startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Date Range Validation Error */}
        {!isValidRange && dateRange.preset === 'custom' && (
          <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>End date must be after start date</span>
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
        <h4 className="text-sm font-semibold text-foreground">Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Total Helpers</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{summary.totalHelpers}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PoundSterling className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Total Cost</span>
            </div>
            <p className="text-lg font-semibold text-foreground">£{summary.totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Error loading billing data</p>
            <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && rows.length === 0 && isValidRange && (
        <EmptyState
          icon={<FileSpreadsheet className="w-12 h-12 text-muted-foreground flex-shrink-0" />}
          title="No billing data"
          description="No billing data found for the selected period."
        />
      )}

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={exportCSV}
          disabled={isGenerating || rows.length === 0 || !isValidRange}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={exportExcel}
          disabled={isGenerating || rows.length === 0 || !isValidRange}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Export Excel
            </>
          )}
        </Button>
      </div>

      {/* Info Text */}
      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Export includes {rows.length} billing period{rows.length !== 1 ? 's' : ''} for {summary.totalHelpers} helper{summary.totalHelpers !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

