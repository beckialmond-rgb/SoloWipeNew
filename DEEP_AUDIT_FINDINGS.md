# Deep Audit Findings - Archive Silent Crash

## Issues Found and Fixed

### ✅ Fix #1: Z-Index Conflict (CRITICAL)
**Problem**: AlertDialog overlay had `z-50` but CustomerDetailModal backdrop has `z-[60]`. This meant the AlertDialog overlay could be behind the modal backdrop, creating a trapped overlay.

**Location**: `src/components/ui/alert-dialog.tsx`

**Fix**: 
- Changed AlertDialogOverlay from `z-50` to `z-[70]`
- Changed AlertDialogContent from `z-50` to `z-[70]`
- Now AlertDialog is above the modal (`z-[70]` > `z-[60]`)

### ✅ Fix #2: AlertDialog Persistence (CRITICAL)
**Problem**: AlertDialog was checking `open={showArchiveConfirm && isOpen}`, which means if `isOpen` becomes false but `showArchiveConfirm` is still true (or vice versa), the AlertDialog overlay could persist in the DOM even after modal closes.

**Location**: `src/components/CustomerDetailModal.tsx`

**Fix**: 
- Wrapped AlertDialog in `{isOpen && (...)}` conditional render
- Changed `open={showArchiveConfirm && isOpen}` to just `open={showArchiveConfirm}`
- Now AlertDialog is completely removed from DOM when modal closes

### ✅ Verified #3: Component Shadows
**Status**: ✅ NO DUPLICATES FOUND
- Only one `useSupabaseData` hook exists
- Only one `CustomerDetailModal` component exists
- Only one import of `archiveCustomer` in Customers.tsx
- Flow: `Customers.tsx` → `handleArchiveCustomer` → `archiveCustomer` from `useSupabaseData`

### ✅ Verified #4: Prop Drilling
**Status**: ✅ CLEAN PROP CHAIN
- `Customers.tsx` gets `archiveCustomer` from `useSupabaseData()` hook
- Passes to `CustomerDetailModal` as `onArchive` prop
- Only one layer of prop passing - no deep drilling

### ✅ Verified #5: Supabase RLS & Types
**Status**: ✅ CORRECT TYPE
- Migration file confirms: `is_archived BOOLEAN NOT NULL DEFAULT false`
- TypeScript interface confirms: `is_archived: boolean`
- Code sends: `is_archived: true` (boolean)
- ✅ Type matches database schema

### ✅ Verified #6: Event Bubbling
**Status**: ✅ PROPERLY HANDLED
- Archive button: `onClick={() => setShowArchiveConfirm(true)}` - no parent clickable
- AlertDialogAction: Has `e.preventDefault()` and `e.stopPropagation()`
- AlertDialogCancel: Has `e.preventDefault()` and `e.stopPropagation()`
- Backdrop: Has `e.preventDefault()` and `e.stopPropagation()`
- ✅ All events properly stopped

## Root Cause Identified

The **silent freeze** was caused by:

1. **Z-Index Conflict**: AlertDialog overlay (`z-50`) was behind modal backdrop (`z-[60]`), creating a trapped overlay that blocked all interactions
2. **Overlay Persistence**: AlertDialog could remain in DOM even after modal closed if state got out of sync

## Data Flow Verified

```
Button Click → setShowArchiveConfirm(true)
  ↓
AlertDialog opens (z-[70] overlay)
  ↓
User clicks "Archive" → handleArchive() called
  ↓
forceClose() called FIRST (removes modal from DOM)
  ↓
onArchive(customerId) called (async, fire-and-forget)
  ↓
archiveCustomer(id) in useSupabaseData
  ↓
Supabase: UPDATE customers SET is_archived = true WHERE id = id
  ↓
Query invalidation (delayed by 100ms)
  ↓
Page refresh (after 500ms) if successful
```

All steps verified ✅

## Testing Checklist

- [x] Z-index hierarchy correct (AlertDialog > Modal > BottomNav)
- [x] AlertDialog removed from DOM when modal closes
- [x] No duplicate components or hooks
- [x] Clean prop chain (one layer)
- [x] Database schema matches TypeScript types
- [x] Event bubbling properly stopped
- [x] Modal closes before async operation
- [x] Hard refresh after success

## Expected Behavior Now

1. Click "Archive Customer" → Confirmation dialog appears (z-[70])
2. Click "Archive" → Modal closes immediately
3. Archive operation runs in background
4. On success → Page refreshes after 500ms
5. On error → Error toast shows, user can retry

The app should **never freeze** because:
- Modal is removed from DOM before async operation
- AlertDialog is removed when modal closes
- Z-index hierarchy prevents overlay conflicts
- Hard refresh ensures state sync

