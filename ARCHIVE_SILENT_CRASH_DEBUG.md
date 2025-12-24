# Archive Silent Crash - Debug Guide

## Problem
Archive customer crashes with NO console error - React appears to freeze/hang.

## Possible Causes

1. **Infinite Render Loop** - State updates causing cascading re-renders
2. **Query Invalidation Cascade** - Invalidating queries causes all dependent components to re-render simultaneously
3. **Modal Close Callback Issue** - `onClose()` callback in parent component causes issues
4. **React Freeze** - Too many synchronous operations blocking main thread

## Current Fixes Applied

1. ✅ Removed immediate query invalidation (causes render cascades)
2. ✅ Added delayed query invalidation with setTimeout(0)
3. ✅ Simplified archive handler to async IIFE
4. ✅ All close mechanisms always enabled
5. ✅ Error handling wraps everything

## Next Steps to Debug

1. **Add console.log at every step** to see where it freezes
2. **Check React DevTools Profiler** - look for infinite renders
3. **Test with minimal archive function** - just update DB, no queries, no toasts
4. **Check parent component** - see if `onClose` callback causes issues

## Test This Minimal Archive Function

```typescript
const archiveCustomer = async (id: string): Promise<void> => {
  console.log("START archiveCustomer", id);
  
  try {
    const { error } = await supabase
      .from('customers')
      .update({ is_archived: true })
      .eq('id', id);
    
    console.log("Database update complete", error ? 'ERROR' : 'SUCCESS');
    
    if (error) throw error;
    
    console.log("END archiveCustomer SUCCESS");
  } catch (error) {
    console.log("END archiveCustomer ERROR", error);
    throw error;
  }
};
```

If this minimal version works, then the issue is in query invalidation or toast.

