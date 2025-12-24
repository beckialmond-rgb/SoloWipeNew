# Archive Customer Flow - Audit Report

## Current Implementation

### Archive Process
When a customer is archived:
1. Customer `status` is set to `'inactive'`
2. Customer `archived_at` timestamp is set
3. All pending jobs for the customer are cancelled (`cancelled_at` is set)
4. **No data is deleted** - all historical data is preserved

### Data Retention Policy
✅ **COMPLETED JOBS**: Always retained and included in:
- Earnings reports
- Weekly earnings calculations
- Export functions (CSV exports)
- Monthly earnings charts
- Customer history modal

✅ **PAYMENT HISTORY**: Always retained and included in:
- Export functions
- Financial reports
- All completed job queries

❌ **UNPAID JOBS**: Currently filtered out from:
- Money tab unpaid jobs list
- BottomNav unpaid count badge

## Issues Found

### Issue 1: Unpaid Jobs from Archived Customers Hidden
**Location**: `useSupabaseData.tsx` - `unpaidJobs` query (line 335)
**Problem**: Query filters by `.eq('customer.status', 'active')` which excludes archived customers' unpaid jobs
**Impact**: If you archive a customer with unpaid completed jobs, they disappear from the Money tab and cannot be marked as paid
**Fix**: Remove the customer status filter so all unpaid jobs show, regardless of customer status

### Issue 2: Unpaid Count Excludes Archived Customers
**Location**: `BottomNav.tsx` - unpaid count query (line 26)
**Problem**: Query filters by `.eq('customer.status', 'active')` 
**Impact**: Unpaid count badge doesn't include unpaid jobs from archived customers
**Fix**: Remove the customer status filter

## Correct Behavior

### What Should Happen
1. ✅ Archived customers disappear from customer list (status = 'inactive')
2. ✅ Cancelled pending jobs don't show in pending/upcoming lists
3. ✅ **Unpaid completed jobs from archived customers should still show in Money tab**
4. ✅ **Unpaid count should include archived customers' unpaid jobs**
5. ✅ All completed jobs (paid and unpaid) from archived customers appear in:
   - Earnings reports
   - Weekly/monthly earnings charts
   - Export functions
   - Customer history (when viewing archived customer)

### What Already Works Correctly
✅ Completed jobs queries include archived customers
✅ Export functions include archived customers' data
✅ Weekly earnings include archived customers
✅ Customer history modal works for archived customers

## Implementation Plan

✅ **COMPLETED:**
1. ✅ Removed customer status filter from unpaid jobs query
2. ✅ Removed customer status filter from BottomNav unpaid count
3. ✅ Added comprehensive comments to archive mutation documenting data retention policy
4. ✅ Updated comments in unpaid jobs queries to explain inclusion of archived customers

## Verification

### Queries That Correctly Include Archived Customers (No Changes Needed)
✅ **Completed Jobs Queries:**
- `completedToday` - includes archived customers ✓
- `weeklyEarningsData` - includes archived customers ✓
- `completedJobsRange` (Earnings page) - includes archived customers ✓
- `paidThisWeek` - includes archived customers ✓

✅ **Export Queries:**
- `ExportEarningsModal` - includes archived customers ✓
- All export functions include archived customers ✓

✅ **Reporting Queries:**
- `MonthlyEarningsChart` - includes archived customers ✓
- Weekly earnings calculations - includes archived customers ✓

✅ **Customer History:**
- `CustomerHistoryModal` - queries all jobs for customer regardless of status ✓

### Queries Fixed to Include Archived Customers
✅ **Unpaid Jobs:**
- `unpaidJobs` - NOW includes archived customers (was filtering them out)
- `unpaidCount` (BottomNav) - NOW includes archived customers (was filtering them out)

### Queries That Correctly Exclude Archived Customers (By Design)
✅ **Customer List:**
- `customers` - filters by `status = 'active'` ✓ (correct - archived customers should be hidden from list)

✅ **Pending/Upcoming Jobs:**
- `pendingJobs` - filters by `cancelled_at IS NULL` ✓ (correct - cancelled pending jobs shouldn't show)
- `upcomingJobs` - filters by `cancelled_at IS NULL` ✓ (correct - cancelled pending jobs shouldn't show)

## Final State

### Archive Customer Flow Now Works As Intended:

1. ✅ **Customer removed from list** - status set to 'inactive', hidden from customer list
2. ✅ **Pending jobs cancelled** - cancelled_at set, won't show in pending/upcoming
3. ✅ **Completed jobs preserved** - all completed jobs remain accessible
4. ✅ **Unpaid jobs visible** - unpaid completed jobs show in Money tab for collection
5. ✅ **Payment history preserved** - all payment data available for exports/reports
6. ✅ **Financial reports complete** - all earnings/reports include archived customers' data
7. ✅ **Export functions complete** - CSV exports include all historical data
8. ✅ **Customer can be restored** - from Settings within 7 days

All historical data is preserved and accessible for financial reporting while archived customers are properly hidden from the active customer list.

