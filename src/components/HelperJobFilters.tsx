import { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export type JobFilterStatus = 'all' | 'pending' | 'completed';
export type JobFilterDateRange = 'today' | 'this-week' | 'this-month' | 'all' | 'custom';

export interface HelperJobFilters {
  searchQuery: string;
  status: JobFilterStatus;
  dateRange: JobFilterDateRange;
  customStartDate?: string;
  customEndDate?: string;
}

interface HelperJobFiltersProps {
  filters: HelperJobFilters;
  onFiltersChange: (filters: HelperJobFilters) => void;
  assignedJobsCount: number;
}

export function HelperJobFilters({
  filters,
  onFiltersChange,
  assignedJobsCount,
}: HelperJobFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value,
    });
  };

  const handleStatusChange = (status: JobFilterStatus) => {
    onFiltersChange({
      ...filters,
      status,
    });
  };

  const handleDateRangeChange = (range: JobFilterDateRange) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
      customStartDate: range === 'custom' ? filters.customStartDate : undefined,
      customEndDate: range === 'custom' ? filters.customEndDate : undefined,
    });
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      customStartDate: type === 'start' ? value : filters.customStartDate,
      customEndDate: type === 'end' ? value : filters.customEndDate,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      status: 'all',
      dateRange: 'all',
    });
  };

  const hasActiveFilters = filters.searchQuery !== '' || filters.status !== 'all' || filters.dateRange !== 'all';

  const getDateRangeLabel = () => {
    switch (filters.dateRange) {
      case 'today':
        return 'Today';
      case 'this-week':
        return 'This Week';
      case 'this-month':
        return 'This Month';
      case 'custom':
        if (filters.customStartDate && filters.customEndDate) {
          return `${format(new Date(filters.customStartDate), 'MMM d')} - ${format(new Date(filters.customEndDate), 'MMM d')}`;
        }
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by customer name or address..."
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {filters.searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filter */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex items-center gap-2",
                hasActiveFilters && "border-primary"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{getDateRangeLabel()}</span>
              <span className="sm:hidden">Date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filters.dateRange === 'custom' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">End Date</label>
                    <Input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearFilters();
                    setIsFilterOpen(false);
                  }}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Results Count */}
        <div className="ml-auto text-sm text-muted-foreground hidden sm:block">
          {assignedJobsCount} job{assignedJobsCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

