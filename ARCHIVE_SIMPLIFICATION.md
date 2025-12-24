# Archive Customer Function - Simplified

## Changes Made

### Simplified `archiveCustomer` Function

**Before**: Complex `useMutation` with optimistic updates, error handling, rollback logic, etc.

**After**: Simple async function that:
1. Logs "Starting archive for: [id]"
2. Updates database: `is_archived = true`
3. Immediately refreshes queries
4. Shows success/error toast

**New Implementation** (line ~1155):
```typescript
const archiveCustomer = async (id: string) => {
  console.log("Starting archive for:", id);
  
  // Update customer to archived
  const { error } = await supabase
    .from('customers')
    .update({ is_archived: true })
    .eq('id', id);
  
  if (error) {
    console.error('Archive error:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to archive customer',
      variant: 'destructive',
    });
    throw error;
  }
  
  // Immediately refresh customers list
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
  queryClient.invalidateQueries({ queryKey: ['upcomingJobs'] });
  queryClient.invalidateQueries({ queryKey: ['recentlyArchived'] });
  queryClient.invalidateQueries({ queryKey: ['allArchivedCustomers'] });
  
  // Show success toast
  toast({
    title: 'Customer archived',
    description: 'Customer has been moved to Archive.',
  });
  
  console.log("Archive complete for:", id);
};
```

## Filter Verification

### ✅ Customer List Filter
**Location**: `useSupabaseData.tsx` line ~83
```typescript
.eq('is_archived', false) // Filter out archived customers
```

### ✅ Job Page Filters
**Location**: `useSupabaseData.tsx`
- `pendingJobs` query (line ~151): `.filter(job => !job.customer?.is_archived)`
- `upcomingJobs` query (line ~243): `.filter(job => !job.customer?.is_archived)`

## Result

✅ **Simple function** - No complex mutation logic  
✅ **Immediate feedback** - Toast notifications  
✅ **Automatic refresh** - Queries invalidated immediately  
✅ **Proper filtering** - Archived customers hidden from lists  
✅ **Jobs filtered** - Archived customers' jobs don't show on Job page  

The Archive button should now work reliably and provide immediate feedback!

