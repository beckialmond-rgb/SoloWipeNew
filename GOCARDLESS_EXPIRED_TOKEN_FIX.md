# GoCardless Expired Token Detection & UI Fix

**Date:** 2025-01-25  
**Status:** ✅ **IMPLEMENTED**

---

## Problem

When a GoCardless access token expires, the Settings page still shows "Connected" even though the token is invalid. When users try to send a DD invite, they get an error saying "connection expired" but the UI doesn't reflect this.

---

## Root Cause

The connection status check in `GoCardlessSection.tsx` only checks for the **presence** of the token in the database, not its **validity**. The token can exist but be expired/invalid.

**Previous Logic:**
```typescript
const isConnected = !!profile?.gocardless_organisation_id && !!profile?.gocardless_access_token_encrypted;
```

This only checks if the token exists, not if it's valid.

---

## Solution Implemented

### 1. Token Expiration Detection

**Location:** `src/components/CustomerDetailModal.tsx` (lines 407-423)

When a DD invite fails with a token expiration error, the app now:
- Detects the expiration error
- Stores expiration state in `localStorage`
- Triggers a UI refresh

**Code:**
```typescript
if (errorBody?.context?.body?.requiresReconnect || 
    is401 ||
    errorMessage.includes('connection expired') ||
    errorMessage.includes('Access token not active') ||
    // ... other expiration indicators
) {
  // Mark token as expired in localStorage
  localStorage.setItem('gocardless_token_expired', 'true');
  localStorage.setItem('gocardless_token_expired_time', Date.now().toString());
  
  // Trigger refresh to update UI
  if (onRefresh) {
    onRefresh();
  }
}
```

### 2. Connection Status Logic Update

**Location:** `src/components/GoCardlessSection.tsx` (lines 67-100)

Added token validity checking:
```typescript
const checkTokenValidity = (): boolean | null => {
  if (!profile?.gocardless_access_token_encrypted) {
    return false;
  }

  // Check if we've recently detected an expired token
  const lastExpirationCheck = localStorage.getItem('gocardless_token_expired');
  if (lastExpirationCheck === 'true') {
    const expirationTime = localStorage.getItem('gocardless_token_expired_time');
    if (expirationTime) {
      const timeSinceExpiration = Date.now() - parseInt(expirationTime, 10);
      if (timeSinceExpiration < 5 * 60 * 1000) { // 5 minutes
        return false; // Token was recently detected as expired
      }
    }
  }

  return null; // Unknown - will be validated when actually used
};

const isTokenExpired = tokenValidityCheck === false;
const isConnected = hasOrgId && hasToken && !isTokenExpired;
const needsReconnect = hasOrgId && hasToken && isTokenExpired;
```

### 3. UI Updates

**Location:** `src/components/GoCardlessSection.tsx`

**Status Badge:**
- ✅ **Connected** (green) - Token valid and active
- 🔴 **Expired** (red) - Token exists but is expired
- ⚠️ **Reconnect Required** (yellow) - Partial connection (no token)
- ❌ **Not Connected** (gray) - No connection

**Status Message:**
- Shows "Connection expired - please reconnect" when `needsReconnect` is true

**Icon:**
- ✅ CheckCircle (green) - Connected
- ⚠️ AlertTriangle (red) - Expired
- 🔗 Link2 (gray) - Not connected

**Action Button:**
- Shows "Reconnect" button when expired (instead of "Disconnect")
- Clears expired flag when reconnecting

### 4. Auto-Clear on Reconnection

**Location:** `src/pages/GoCardlessCallback.tsx` (lines 262-266)

When connection is successfully established:
```typescript
// Clear expired token flag since connection is now fresh
localStorage.removeItem('gocardless_token_expired');
localStorage.removeItem('gocardless_token_expired_time');
```

**Location:** `src/components/GoCardlessSection.tsx` (lines 119-130)

When connection timestamp is updated:
```typescript
useEffect(() => {
  if (profile?.gocardless_connected_at) {
    const lastExpiration = localStorage.getItem('gocardless_token_expired_time');
    const connectedAt = new Date(profile.gocardless_connected_at).getTime();
    if (lastExpiration && parseInt(lastExpiration, 10) < connectedAt) {
      // Connection is newer than expiration detection, clear the flag
      localStorage.removeItem('gocardless_token_expired');
      localStorage.removeItem('gocardless_token_expired_time');
    }
  }
}, [profile?.gocardless_connected_at]);
```

---

## User Experience Flow

### Before Fix:
1. Token expires
2. Settings shows "Connected" ✅
3. User tries to send DD invite
4. Gets error: "Connection expired"
5. Settings still shows "Connected" ❌ (confusing!)

### After Fix:
1. Token expires
2. Settings shows "Connected" ✅
3. User tries to send DD invite
4. Gets error: "Connection expired"
5. **Settings automatically updates to show "Expired" 🔴**
6. User sees "Reconnect" button
7. User clicks "Reconnect"
8. After reconnection, shows "Connected" ✅

---

## Files Modified

1. **`src/components/GoCardlessSection.tsx`**
   - Added `checkTokenValidity()` function
   - Updated connection status logic
   - Added expired status UI
   - Added auto-clear on reconnection
   - Updated status badge and messages

2. **`src/components/CustomerDetailModal.tsx`**
   - Added expiration detection in `sendDDLinkViaSMS()`
   - Sets `localStorage` flags when expiration detected
   - Triggers UI refresh

3. **`src/pages/GoCardlessCallback.tsx`**
   - Clears expired flag on successful connection

---

## Testing

### Test Scenarios:

1. **Expired Token Detection:**
   - ✅ Send DD invite with expired token
   - ✅ Verify Settings shows "Expired" status
   - ✅ Verify "Reconnect" button appears

2. **Reconnection:**
   - ✅ Click "Reconnect" button
   - ✅ Complete OAuth flow
   - ✅ Verify Settings shows "Connected" after callback
   - ✅ Verify expired flag is cleared

3. **Auto-Clear:**
   - ✅ Reconnect via OAuth
   - ✅ Verify expired flag cleared automatically
   - ✅ Verify status updates correctly

---

## Status

✅ **IMPLEMENTED** - Token expiration is now detected and UI updates automatically

**Next Steps:**
- Test in production
- Monitor for any edge cases
- Consider adding proactive token validation (optional enhancement)

---

**Fix Completed By:** Lead Systems Architect  
**Date:** 2025-01-25

