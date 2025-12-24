# Archive Functionality - Full Audit & Fix Summary

## Issues Found & Fixed

### 1. Data Integrity ✅ FIXED

**Issue**: Jobs from archived customers were still appearing on Job/Run Sheet page because queries didn't filter by `customer.is_archived`.

**Fix Applied**:
- ✅ Added client-side filtering in `pendingJobs` query to exclude jobs from archived customers
- ✅ Added client-side filtering in `upcomingJobs` query to exclude jobs from archived customers
- ✅ Customers query already filters by `is_archived = false` (was already correct)

**Code Changes**:
```typescript
// pendingJobs query - now filters out archived customers
.filter(job => !job.customer?.is_archived)

// upcomingJobs query - now filters out archived customers  
.filter(job => !job.customer?.is_archived)
```

### 2. State Sync ✅ FIXED

**Issue**: After archiving, jobs from that customer remained visible on the Job page until manual refresh.

**Fix Applied**:
- ✅ Added optimistic updates in `archiveCustomerMutation.onMutate` to immediately remove jobs from `pendingJobs` and `upcomingJobs` cache
- ✅ Added proper rollback in `onError` to restore previous state if archive fails
- ✅ Query invalidation already exists in `onSettled` (was already correct)

**Code Changes**:
```typescript
onMutate: async (id) => {
  // Cancel queries
  await queryClient.cancelQueries({ queryKey: ['pendingJobs'] });
  await queryClient.cancelQueries({ queryKey: ['upcomingJobs'] });
  
  // Snapshot previous values
  const previousPendingJobs = queryClient.getQueryData(['pendingJobs', user?.id, today]);
  const previousUpcomingJobs = queryClient.getQueryData(['upcomingJobs', user?.id, today]);
  
  // Optimistically remove jobs from archived customer
  if (previousPendingJobs) {
    const filtered = previousPendingJobs.filter(j => j.customer_id !== id);
    queryClient.setQueryData(['pendingJobs', user?.id, today], filtered);
  }
  
  if (previousUpcomingJobs) {
    const filtered = previousUpcomingJobs.filter(j => j.customer_id !== id);
    queryClient.setQueryData(['upcomingJobs', user?.id, today], filtered);
  }
  
  return { previousCustomers, previousPendingJobs, previousUpcomingJobs };
}
```

### 3. Job Page Link ✅ FIXED

**Issue**: Archived customers' jobs were still appearing on Job/Run Sheet page.

**Fix Applied**:
- ✅ Added filtering in both `pendingJobs` and `upcomingJobs` queries to exclude jobs where `customer.is_archived === true`
- ✅ Archive mutation sets `cancelled_at` on pending jobs, which also filters them out
- ✅ Combined approach ensures jobs disappear immediately and stay hidden

## How It Works Now

### When Archive is Clicked:

1. **Immediate UI Update (Optimistic)**:
   - Customer removed from customer list ✅
   - Jobs from that customer removed from pendingJobs cache ✅
   - Jobs from that customer removed from upcomingJobs cache ✅
   - User sees changes instantly, no refresh needed ✅

2. **Database Update**:
   - Customer `is_archived` set to `true` ✅
   - Customer `archived_at` timestamp set ✅
   - Customer `status` set to `inactive` ✅
   - All pending jobs for that customer get `cancelled_at` set ✅

3. **Query Refetch (onSettled)**:
   - All relevant queries invalidated and refetched ✅
   - Ensures data consistency ✅

4. **Ongoing Filtering**:
   - `pendingJobs` query filters out jobs from archived customers ✅
   - `upcomingJobs` query filters out jobs from archived customers ✅
   - Jobs stay hidden even after page refresh ✅

## Testing Checklist

- [x] Customer disappears from customer list immediately when archived
- [x] Jobs from archived customer disappear from Job/Run Sheet immediately
- [x] Jobs from archived customer don't reappear after page refresh
- [x] Toast notification shows "Customer archived"
- [x] Archive section in Settings shows archived customer
- [x] Completed jobs from archived customer still visible in Money tab (for financial reporting)
- [x] Unpaid jobs from archived customer still visible in Money tab (for collection)

## Files Modified

1. `src/hooks/useSupabaseData.tsx`:
   - Added client-side filtering in `pendingJobs` query
   - Added client-side filtering in `upcomingJobs` query
   - Enhanced `archiveCustomerMutation.onMutate` with optimistic job updates
   - Enhanced `archiveCustomerMutation.onError` with job state rollback

## Notes

- Client-side filtering is used instead of database-level filtering for nested customer fields because PostgREST doesn't support filtering on joined table columns directly
- The combination of optimistic updates + query invalidation ensures immediate UI updates and data consistency
- Archive mutation also sets `cancelled_at` on jobs, providing a double layer of filtering (both `cancelled_at` check and `is_archived` check)

