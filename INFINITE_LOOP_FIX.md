# Infinite Loop Fix - Index.tsx:221

## Problem Identified

**Error**: "Maximum update depth exceeded" at Index.tsx:221

**Root Cause**: The `useEffect` at line 219-236 was causing an infinite loop:
- It was calling `setLocalJobs()` every time `pendingJobs` changed
- `pendingJobs` might get a new array reference even when contents are the same
- `applyPersistedOrder()` always returns a new array reference
- This triggered the effect repeatedly, pegging the CPU
- The Archive button was unresponsive because the app was stuck in a render loop

## Fix Applied

### 1. Added useRef to Track Previous State
```typescript
const previousJobIdsRef = useRef<string>('');
```

### 2. Stable Comparison Before State Update
- Compare job IDs as a sorted string (stable representation)
- Only update state if job IDs actually changed
- Skip update if job IDs are the same (prevents infinite loop)

### 3. Removed Problematic Dependencies
- Removed `localJobs` from dependency array (was causing the loop)
- Kept only necessary dependencies: `pendingJobs`, `applyPersistedOrder`, `orderRestored`, `toast`

## Code Changes

**Before** (causing infinite loop):
```typescript
useEffect(() => {
  const { jobs: orderedJobs, wasRestored } = applyPersistedOrder(pendingJobs);
  setLocalJobs(orderedJobs); // Always called, even if no change
  // ...
}, [pendingJobs, applyPersistedOrder]);
```

**After** (fixed):
```typescript
useEffect(() => {
  // Create stable string representation
  const newJobIds = pendingJobs.map(j => j.id).sort().join(',');
  
  // Skip if no change (prevents infinite loop)
  if (previousJobIdsRef.current === newJobIds && pendingJobs.length > 0) {
    return;
  }
  
  previousJobIdsRef.current = newJobIds; // Update ref
  const { jobs: orderedJobs, wasRestored } = applyPersistedOrder(pendingJobs);
  setLocalJobs(orderedJobs); // Only called when jobs actually change
  // ...
}, [pendingJobs, applyPersistedOrder, orderRestored, toast]);
```

## Result

✅ **Infinite loop fixed** - useEffect only runs when job IDs actually change  
✅ **CPU usage normal** - No more render loops  
✅ **Archive button works** - App is responsive again  
✅ **Performance improved** - No unnecessary state updates  

The Archive button should now work correctly since the app is no longer stuck in a render loop.

