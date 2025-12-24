# SMS Picker Not Opening - Fix

**Date:** $(date)  
**Status:** ✅ Fixed

---

## Issue
SMS template picker not opening when clicking "Send SMS" button in Customer Detail Modal.

---

## Root Cause
**Z-Index Conflict**: The Drawer component (used by SMSTemplatePicker) had `z-50`, but the CustomerDetailModal has `z-[60]`. This caused the drawer to appear behind the modal, making it invisible.

**Z-Index Hierarchy:**
- CustomerDetailModal: `z-[60]`
- Drawer (old): `z-50` ❌ (behind modal)
- Drawer (fixed): `z-[80]` ✅ (above modal)

---

## Fixes Applied

### ✅ Fix #1: Increased Drawer Z-Index
**File:** `src/components/ui/drawer.tsx`

**Changes:**
- DrawerOverlay: `z-50` → `z-[80]`
- DrawerContent: `z-50` → `z-[80]`

**Before:**
```typescript
className={cn("fixed inset-0 z-50 bg-black/80", className)}
className={cn("fixed inset-x-0 bottom-0 z-50 mt-24 ...", className)}
```

**After:**
```typescript
className={cn("fixed inset-0 z-[80] bg-black/80", className)}
className={cn("fixed inset-x-0 bottom-0 z-[80] mt-24 ...", className)}
```

---

### ✅ Fix #2: Added Debug Logging
**Files:** 
- `src/components/CustomerDetailModal.tsx`
- `src/hooks/useSMSTemplate.tsx`
- `src/components/SMSTemplatePicker.tsx`

**Purpose:** Help diagnose any future issues with SMS picker not opening.

**Logs Added:**
- When Send SMS button is clicked
- When showTemplatePicker is called
- When picker state is set
- When SMSTemplatePicker receives props

---

## Z-Index Hierarchy (Final)

| Component | Z-Index | Purpose |
|-----------|---------|---------|
| CustomerHistoryModal | `z-[70]` | History modal (above detail modal) |
| SMSTemplatePicker (Drawer) | `z-[80]` | SMS template picker (above all modals) |
| CustomerDetailModal | `z-[60]` | Customer detail modal |
| Backdrop | `z-[60]` | Modal backdrop |

---

## Testing

1. ✅ Open customer detail modal
2. ✅ Click "Send SMS" button
3. ✅ SMS template picker should appear above the modal
4. ✅ Select a template
5. ✅ SMS app should open with the message

---

## Status
✅ **FIXED** - SMS picker now opens correctly above the customer detail modal.

