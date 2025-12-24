# OAuth Redirect Fix

## Issue

When users sign in using Google OAuth, they were being redirected back to the landing page (`/`) instead of going directly to the dashboard/app (`/dashboard`).

## Root Cause

The OAuth `redirectTo` parameter in `src/hooks/useAuth.tsx` was set to:
```typescript
const redirectTo = `${origin}/`;
```

This caused Supabase to redirect users back to the root route (`/`), which is the Landing page, after successful OAuth authentication.

## Fix

Changed the redirect URL to point directly to the dashboard:
```typescript
const redirectTo = `${origin}/dashboard`;
```

## Why This Works

1. **Direct Navigation**: Users are now redirected directly to `/dashboard` after OAuth
2. **Protected Route**: The `/dashboard` route is wrapped in `ProtectedRoute`, which:
   - Shows a loading state while checking authentication
   - Redirects to `/auth` if not authenticated (shouldn't happen after OAuth)
   - Renders the dashboard if authenticated
3. **Auth State**: The Auth page already has logic to redirect authenticated users to dashboard, but by going directly to `/dashboard`, we skip the landing page entirely

## User Flow (After Fix)

1. User clicks "Sign in with Google"
2. Redirects to Google OAuth
3. User selects account
4. Google redirects back to app at `/dashboard`
5. Supabase processes OAuth callback
6. Auth state changes to authenticated
7. Dashboard renders (protected route allows it)
8. User sees their dashboard/app

## Testing

Verify:
- [ ] OAuth sign-in redirects to `/dashboard` (not `/`)
- [ ] Dashboard loads correctly after OAuth
- [ ] New users see business name modal if needed
- [ ] Existing users go straight to dashboard
- [ ] Error handling still works correctly

