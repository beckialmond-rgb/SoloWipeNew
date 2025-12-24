# Persistent Handshake Implementation for GoCardless

## Overview

Implemented a persistent handshake pattern for the GoCardless OAuth redirect flow to solve connection drop issues. The solution uses localStorage to persist session data across redirects, ensuring the callback can complete even if React state is lost.

---

## Architecture

### 1. Outbound Handshake (Pre-Redirect)

**Location:** `src/components/GoCardlessSection.tsx`

**Implementation:**
- Generates a unique `session_token` using `generateSessionToken()`
- Stores in localStorage:
  - `gocardless_session_token` - Unique session identifier
  - `gocardless_user_id` - Current user ID
  - `gocardless_redirect_url` - The hardcoded callback URL
  - `gocardless_state` - OAuth state for verification

**Key Features:**
- Session token format: `gc_{timestamp}_{random}`
- All data stored in localStorage (survives page reloads/redirects)
- Uses dedicated callback route: `/gocardless-callback`

### 2. Hardcoded Redirect URI

**URL Structure:**
- **Development:** `http://localhost:8080/gocardless-callback`
- **Production:** `https://solowipe.co.uk/gocardless-callback`

**Important:**
- Flat route (no query params in base URL)
- Must be whitelisted in GoCardless Dashboard exactly as shown
- No trailing slashes

### 3. Inbound Handshake (Callback Handler)

**Location:** `src/pages/GoCardlessCallback.tsx`

**Implementation:**
- Dedicated React component for `/gocardless-callback` route
- On mount, reads:
  - Authorization `code` from URL params
  - `session_token` from localStorage
  - `user_id` from localStorage
  - `redirect_url` from localStorage

**Validation:**
1. Checks for GoCardless error parameters
2. Validates authorization code exists
3. **Critical:** Validates `session_token` exists (handshake validation)
4. Validates redirect URL matches expected
5. Calls `gocardless-callback` Edge Function to complete connection

**Error Handling:**
- If `session_token` missing → Shows "Connection expired" message
- Redirects to Settings after error or success
- Cleans up localStorage after processing

---

## Files Modified

### 1. `src/pages/GoCardlessCallback.tsx` (NEW)
- Dedicated callback page component
- Handles OAuth callback processing
- Shows loading/success/error states
- Implements persistent handshake validation

### 2. `src/components/GoCardlessSection.tsx`
- Added `useAuth()` hook to get user ID
- Added `generateSessionToken()` function
- Updated `handleConnect()` to:
  - Generate session token
  - Store in localStorage (session_token, user_id, redirect_url)
  - Use hardcoded `/gocardless-callback` route
- Clean up localStorage on errors

### 3. `src/App.tsx`
- Added route: `/gocardless-callback` → `<GoCardlessCallback />`
- Route is outside Layout (no bottom nav)

### 4. `src/components/Layout.tsx`
- Added `/gocardless-callback` to `hideNavRoutes` array

### 5. `src/pages/Settings.tsx`
- Removed old callback handling logic (useEffect with searchParams)
- Removed `useRef` import (no longer needed)
- Added comment explaining callback moved to dedicated route

---

## Flow Diagram

```
User clicks "Connect GoCardless"
  ↓
GoCardlessSection.handleConnect()
  ↓
1. Generate session_token
2. Store in localStorage: session_token, user_id, redirect_url
3. Call gocardless-connect Edge Function
  ↓
Redirect to GoCardless OAuth page
  ↓
User authorizes
  ↓
GoCardless redirects to: /gocardless-callback?code=XXX&state=YYY
  ↓
GoCardlessCallback component mounts
  ↓
1. Read code from URL
2. Read session_token from localStorage (HANDSHAKE VALIDATION)
3. Validate redirect URL matches
4. Call gocardless-callback Edge Function
  ↓
Success → Redirect to /settings
Error → Show error, redirect to /settings
```

---

## localStorage Keys

| Key | Purpose | When Set | When Cleared |
|-----|---------|----------|--------------|
| `gocardless_session_token` | Unique session identifier | Before redirect | After callback completes or on error |
| `gocardless_user_id` | Current user ID | Before redirect | After callback completes or on error |
| `gocardless_redirect_url` | Expected callback URL | Before redirect | After callback completes or on error |
| `gocardless_state` | OAuth state for verification | Before redirect | After callback completes or on error |

---

## Error Recovery

### Missing Session Token
**Scenario:** User arrives at `/gocardless-callback` but localStorage is empty

**Handling:**
- Shows error: "Connection session expired"
- Toast: "Please try connecting again from Settings"
- Redirects to `/settings` after 3 seconds
- Prevents blank screen or infinite loops

### Redirect URL Mismatch
**Scenario:** Callback URL doesn't match expected URL

**Handling:**
- Validates `expectedBaseUrl === actualBaseUrl`
- Shows specific error with expected vs actual URLs
- Redirects to Settings
- Cleans up localStorage

---

## GoCardless Dashboard Configuration

### Required Redirect URI

Add this exact URL to GoCardless Dashboard → Settings → API → Redirect URIs:

**Development:**
```
http://localhost:8080/gocardless-callback
```

**Production:**
```
https://solowipe.co.uk/gocardless-callback
```

**Important:**
- No trailing slash
- Exact match required
- Case-sensitive
- Include protocol (http/https)

---

## Testing Checklist

- [ ] Session token is generated before redirect
- [ ] Session token stored in localStorage
- [ ] User ID stored in localStorage
- [ ] Redirect URL uses `/gocardless-callback` route
- [ ] Callback page loads correctly
- [ ] Session token validation works (shows error if missing)
- [ ] Successful connection redirects to Settings
- [ ] Error states redirect to Settings
- [ ] localStorage cleaned up after success/error
- [ ] Redirect URL matches GoCardless Dashboard exactly

---

## Benefits

1. **Persistent State:** localStorage survives page reloads and redirects
2. **Better Error Handling:** Clear error messages if handshake fails
3. **Dedicated Route:** Clean separation of concerns
4. **No State Loss:** React state can reset without losing connection data
5. **User-Friendly:** Loading states and clear error messages
6. **Recovery:** Automatic redirect to Settings if something goes wrong

---

## Migration Notes

The old callback handling in `Settings.tsx` (using `searchParams` and `useEffect`) has been removed. All callback processing now happens in the dedicated `GoCardlessCallback` component.

This ensures:
- Clean separation of concerns
- No conflicts with Settings page state
- Better error recovery
- Persistent handshake validation

