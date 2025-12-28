import { motion, AnimatePresence } from 'framer-motion';
import { format, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronDown, ChevronUp, SkipForward, Clock, CreditCard, Search, X, CheckSquare, Square } from 'lucide-react';
import { useState, useMemo } from 'react';
import { JobWithCustomer } from '@/types/database';
import { cn, formatCurrency } from '@/lib/utils';
import { TextCustomerButton } from '@/components/TextCustomerButton';

interface UpcomingJobsSectionProps {
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
  onSelectAll?: () => void;
}

interface GroupedJobs {
  tomorrow: JobWithCustomer[];
  thisWeek: JobWithCustomer[];
  later: JobWithCustomer[];
}

export function UpcomingJobsSection({ 
  jobs, 
  onJobClick, 
  onSkip, 
  businessName = 'SoloWipe',
  bulkMode = false,
  selectedJobIds = new Set(),
  onToggleSelect,
  onSelectAll,
}: UpcomingJobsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    
    const query = searchQuery.toLowerCase().trim();
    return jobs.filter(job => {
      const customerName = job.customer?.name || '';
      const customerAddress = job.customer?.address || '';
      return (
        customerName.toLowerCase().includes(query) ||
        customerAddress.toLowerCase().includes(query)
      );
    });
  }, [jobs, searchQuery]);

  // Group filtered jobs by date category
  const groupedJobs: GroupedJobs = filteredJobs.reduce(
    (acc, job) => {
      const jobDate = new Date(job.scheduled_date);
      
      if (isTomorrow(jobDate)) {
        acc.tomorrow.push(job);
      } else if (isThisWeek(jobDate, { weekStartsOn: 1 })) {
        acc.thisWeek.push(job);
      } else {
        acc.later.push(job);
      }
      
      return acc;
    },
    { tomorrow: [], thisWeek: [], later: [] } as GroupedJobs
  );

  const totalUpcoming = filteredJobs.length;
  const originalTotal = jobs.length;

  if (originalTotal === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      {/* Section Header with Search */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 py-2 flex-1"
            aria-expanded={isExpanded}
            aria-controls="upcoming-jobs-content"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} upcoming jobs section`}
          >
            <Calendar className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
            <span 
              className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground"
              aria-label={`${originalTotal} upcoming ${originalTotal === 1 ? 'job' : 'jobs'}`}
            >
              {originalTotal}
            </span>
            {bulkMode && Array.from(selectedJobIds).filter(id => jobs.some(j => j.id === id)).length > 0 && (
              <span 
                className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-medium"
                aria-label={`${Array.from(selectedJobIds).filter(id => jobs.some(j => j.id === id)).length} selected`}
              >
                {Array.from(selectedJobIds).filter(id => jobs.some(j => j.id === id)).length} selected
              </span>
            )}
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        {/* Search Bar - shown when expanded */}
        {isExpanded && originalTotal > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="upcoming-jobs-search-input"
              name="upcoming-jobs-search"
              type="text"
              placeholder="Search by customer name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted-foreground/20 transition-colors touch-sm min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Search Results Count */}
        {isExpanded && searchQuery && (
          <p className="text-sm text-muted-foreground">
            {totalUpcoming === 0 
              ? 'No jobs found' 
              : `Found ${totalUpcoming} job${totalUpcoming !== 1 ? 's' : ''}`
            }
          </p>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="upcoming-jobs-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {totalUpcoming === 0 && searchQuery ? (
              <div className="py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No jobs found matching "{searchQuery}"</p>
              </div>
            ) : (
              <>
                {/* Tomorrow */}
                {groupedJobs.tomorrow.length > 0 && (
                  <JobGroup 
                    title="Tomorrow" 
                    jobs={groupedJobs.tomorrow} 
                    onJobClick={onJobClick} 
                    onSkip={onSkip} 
                    businessName={businessName}
                    bulkMode={bulkMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}

                {/* This Week */}
                {groupedJobs.thisWeek.length > 0 && (
                  <JobGroup 
                    title="This Week" 
                    jobs={groupedJobs.thisWeek} 
                    onJobClick={onJobClick} 
                    onSkip={onSkip} 
                    businessName={businessName}
                    bulkMode={bulkMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}

                {/* Later */}
                {groupedJobs.later.length > 0 && (
                  <JobGroup 
                    title="Later" 
                    jobs={groupedJobs.later} 
                    onJobClick={onJobClick} 
                    onSkip={onSkip} 
                    businessName={businessName}
                    bulkMode={bulkMode}
                    selectedJobIds={selectedJobIds}
                    onToggleSelect={onToggleSelect}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface JobGroupProps {
  title: string;
  jobs: JobWithCustomer[];
  onJobClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
}

function JobGroup({ 
  title, 
  jobs, 
  onJobClick, 
  onSkip, 
  businessName = 'SoloWipe',
  bulkMode = false,
  selectedJobIds = new Set(),
  onToggleSelect,
}: JobGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2" role="list" aria-label={`${title} jobs`}>
        {jobs.map((job) => (
          <UpcomingJobCard 
            key={job.id} 
            job={job} 
            onClick={onJobClick} 
            onSkip={onSkip} 
            businessName={businessName}
            bulkMode={bulkMode}
            isSelected={selectedJobIds.has(job.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface UpcomingJobCardProps {
  job: JobWithCustomer;
  onClick?: (job: JobWithCustomer) => void;
  onSkip?: (job: JobWithCustomer) => void;
  businessName?: string;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
}

function UpcomingJobCard({ 
  job, 
  onClick, 
  onSkip, 
  businessName = 'SoloWipe',
  bulkMode = false,
  isSelected = false,
  onToggleSelect,
}: UpcomingJobCardProps) {
  const jobDate = new Date(job.scheduled_date);
  const formattedDate = isTomorrow(jobDate)
    ? 'Tomorrow'
    : format(jobDate, 'EEE, d MMM');

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSkip?.(job);
  };

  const handleToggleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(job.id);
  };

  const customerName = job.customer?.name || 'Unknown Customer';
  const customerAddress = job.customer?.address || 'No address';
  const customerPrice = job.customer?.price || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-stretch rounded-xl bg-card shadow-sm",
        "h-[72px] sm:h-[80px]",
        "border border-border overflow-hidden flex-shrink-0",
        bulkMode && isSelected && "border-primary border-2"
      )}
      role="listitem"
    >
      {bulkMode && (
        <button
          onClick={handleToggleSelect}
          className="flex-shrink-0 p-3 transition-colors"
          aria-label={isSelected ? `Deselect ${customerName}` : `Select ${customerName}`}
        >
          {isSelected ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-muted-foreground" />
          )}
        </button>
      )}
      <button
        onClick={() => {
          if (bulkMode) {
            onToggleSelect?.(job.id);
          } else {
            onClick?.(job);
          }
        }}
        className={cn(
          "flex-1 flex items-center justify-between text-left p-4",
          "hover:bg-muted transition-colors overflow-hidden",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "touch-target"
        )}
        aria-label={bulkMode 
          ? `${isSelected ? 'Deselect' : 'Select'} ${customerName} - ${customerAddress} on ${formattedDate}`
          : `View details for ${customerName} - ${customerAddress} on ${formattedDate}`
        }
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 mb-1.5">
            <p className="font-bold text-foreground text-base leading-tight truncate flex-1 min-w-0">
              {customerName}
            </p>
            {/* Mandate Status Indicator */}
            {job.customer?.gocardless_mandate_status === 'pending' ? (
              <span 
                title="Direct Debit setup pending"
                aria-label="Direct Debit setup pending"
                className="shrink-0"
              >
                <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
              </span>
            ) : job.customer?.gocardless_id ? (
              <span 
                title="Direct Debit active"
                aria-label="Direct Debit active"
                className="shrink-0"
              >
                <CreditCard className="w-4 h-4 text-success" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-muted-foreground truncate min-w-0 leading-snug">
              {customerAddress.split(/[,\n]/)[0].trim()}
            </p>
          </div>
        </div>
        
        <div className="text-right ml-4 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-0.5" aria-label={`Scheduled for ${formattedDate}`}>
            {formattedDate}
          </p>
          <p className="text-base font-semibold text-foreground" aria-label={`Price: ${formatCurrency(customerPrice)}`}>
            {formatCurrency(customerPrice)}
          </p>
        </div>
      </button>

      {/* Action Buttons */}
      <div 
        className="flex flex-col border-l border-border shrink-0 w-[64px]" 
        role="group" 
        aria-label="Job actions"
      >
        {/* Text Button */}
        {job.customer?.mobile_phone ? (
          <div className="flex items-center justify-center border-b border-border h-[36px] sm:h-[40px]">
            <TextCustomerButton
              phoneNumber={job.customer.mobile_phone}
              customerName={customerName}
              customerAddress={customerAddress}
              jobPrice={customerPrice}
              scheduledDate={job.scheduled_date}
              businessName={businessName}
              iconOnly={true}
            />
          </div>
        ) : null}
        
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className={cn(
            "flex items-center justify-center w-full transition-colors",
            "bg-muted hover:bg-muted/80 active:bg-muted/60",
            "focus:outline-none focus:ring-2 focus:ring-muted focus:ring-offset-2",
            job.customer?.mobile_phone 
              ? "h-[36px] sm:h-[40px]" 
              : "h-[72px] sm:h-[80px]"
          )}
          aria-label={`Skip job for ${customerName}`}
        >
          <SkipForward className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
