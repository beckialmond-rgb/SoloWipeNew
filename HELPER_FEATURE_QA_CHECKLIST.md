# Helper Feature QA Checklist
**Date:** 2025-02-10  
**Purpose:** Comprehensive testing guide for Helper feature after audit fixes

---

## Pre-Testing Setup

### 1. Database Migrations
- [ ] Run migration: `20250130000010_add_helper_job_update_policy.sql`
- [ ] Run migration: `20250210000001_fix_helper_deactivation_cleanup.sql`
- [ ] Verify RLS policies are active
- [ ] Verify helper job update policy exists

### 2. Edge Functions
- [ ] Deploy `invite-helper` function (if exists)
- [ ] Deploy `accept-invite` function (if exists)
- [ ] Deploy `manage-helper-billing` function
- [ ] Verify all functions are active

### 3. Test Accounts
- [ ] Create owner account
- [ ] Create helper account
- [ ] Create placeholder helper (no auth user)

---

## 1. HELPER INVITE FLOW

### 1.1 Sending Invites
- [ ] Owner can open invite dialog
- [ ] Email validation works (invalid email shows error)
- [ ] Name field is optional
- [ ] Submit button disabled during loading
- [ ] Success toast shows after invite sent
- [ ] Helper appears in list with "Pending Invite" badge
- [ ] Invite token stored in `team_members` table

### 1.2 Accepting Invites
- [ ] Invite link opens auth page
- [ ] Email is pre-filled from invite
- [ ] Token validation works
- [ ] Expired tokens show "invite expired" message
- [ ] Already accepted tokens show "already accepted" message
- [ ] Invalid tokens show "invalid token" message
- [ ] Password form submits successfully
- [ ] User is automatically signed in after acceptance
- [ ] `invite_accepted_at` is set in database
- [ ] Helper status changes from "Pending Invite" to "Active"

### 1.3 Expired/Invalid Tokens
- [ ] Expired token shows clear error message
- [ ] Invalid token shows clear error message
- [ ] Error message includes actionable guidance
- [ ] URL token is cleaned up after error

### 1.4 Duplicate Invites
- [ ] Attempting to invite same email shows appropriate message
- [ ] Existing pending invite is detected
- [ ] No duplicate invites created in database

### 1.5 Placeholder Helpers
- [ ] Placeholder helpers show "Pending Signup" badge
- [ ] Placeholder helpers cannot be assigned to jobs
- [ ] Error message explains they need to sign up first
- [ ] Placeholder detection uses utility function (not email suffix)

### 1.6 Loading States & UX
- [ ] Loading spinner shows during invite send
- [ ] Button disabled during async operation
- [ ] Error messages are user-friendly
- [ ] Success feedback is clear

---

## 2. HELPER ACTIVATION / DEACTIVATION

### 2.1 Activation
- [ ] Owner can activate helper from billing card
- [ ] `is_active` flag set to `true`
- [ ] `billing_started_at` is set
- [ ] `billing_stopped_at` is cleared
- [ ] Helper appears in "Active Helpers" section
- [ ] Helper can be assigned to jobs after activation

### 2.2 Deactivation
- [ ] Owner can deactivate helper from billing card
- [ ] Confirmation dialog shows
- [ ] Dialog mentions assignment cleanup
- [ ] `is_active` flag set to `false`
- [ ] `billing_stopped_at` is set
- [ ] **CRITICAL: ALL pending job assignments are removed**
- [ ] Helper appears in "Inactive Helpers" section
- [ ] Helper cannot be assigned to jobs after deactivation
- [ ] Helper no longer sees assigned jobs

### 2.3 Billing Flags
- [ ] `is_active` flag correctly reflects billing status
- [ ] `billing_started_at` set on activation
- [ ] `billing_stopped_at` set on deactivation
- [ ] Flags validated before job assignment

### 2.4 UI Indicators
- [ ] Active helpers show "Active" badge
- [ ] Inactive helpers show "Inactive" badge
- [ ] Pending invite helpers show "Pending Invite" badge
- [ ] Pending signup helpers show "Pending Signup" badge
- [ ] Status badges use correct colors

### 2.5 Confirmation Dialogs
- [ ] Deactivation dialog mentions all consequences
- [ ] Dialog mentions assignment removal
- [ ] Dialog mentions billing stop
- [ ] Dialog mentions reactivation option

---

## 3. JOB ASSIGNMENT LOGIC

### 3.1 Assignment Creation
- [ ] Owner can assign job to helper
- [ ] Multiple helpers can be assigned to same job
- [ ] Duplicate assignments prevented (idempotency)
- [ ] Assignment stored in `job_assignments` table
- [ ] `assigned_by_user_id` is set correctly
- [ ] `assigned_at` timestamp is set

### 3.2 Assignment to Inactive Helpers
- [ ] Cannot assign to inactive helper
- [ ] Error message is clear: "Helper is inactive"
- [ ] Error message suggests activation

### 3.3 Assignment to Placeholder Helpers
- [ ] Cannot assign to placeholder helper
- [ ] Error message explains they need to sign up
- [ ] Error message is helpful and actionable

### 3.4 Team Membership Validation
- [ ] Helper must be in owner's team
- [ ] Auto-adds helper to team if not present (or shows error)
- [ ] Assignment fails if helper not in team

### 3.5 RLS Safety
- [ ] Helpers can only see assigned jobs
- [ ] Owners can see all their jobs
- [ ] Helpers cannot see other helpers' assignments
- [ ] RLS policies prevent data leaks

### 3.6 Assignment Cleanup
- [ ] Assignments removed on job completion
- [ ] Assignments removed on helper deactivation
- [ ] Cleanup happens for ALL assignments (not just future)
- [ ] Cleanup doesn't fail silently

### 3.7 Race Condition Protection
- [ ] Unique constraint prevents duplicate assignments
- [ ] Upsert handles concurrent requests
- [ ] No duplicate assignments created under load

---

## 4. HELPER PAYMENT CALCULATION

### 4.1 Null Checks
- [ ] `job.customer.profile_id` null check exists
- [ ] Error logged if profile_id is null
- [ ] Job completion continues if calculation fails (non-critical)
- [ ] `helper_payment_amount` set to null if calculation fails

### 4.2 Commission Logic
- [ ] Commission percentage fetched from `team_members`
- [ ] Commission calculated correctly: `amount × (commission / 100)`
- [ ] Commission rounded to 2 decimal places
- [ ] Commission percentage validated (0-100 range)
- [ ] Zero commission results in null payment

### 4.3 Error Handling
- [ ] Errors logged but don't fail job completion
- [ ] Error messages are descriptive
- [ ] Failed calculations don't crash the app

### 4.4 Payment Storage
- [ ] `helper_payment_amount` stored in jobs table
- [ ] Payment amount is correct
- [ ] Payment persists after job completion

---

## 5. HELPER EARNINGS & VISIBILITY

### 5.1 Earnings Query
- [ ] **CRITICAL: Query filters by assignment**
- [ ] Only shows jobs helper was assigned to
- [ ] Doesn't show jobs helper wasn't assigned to
- [ ] Query joins with `job_assignments` table
- [ ] RLS prevents seeing other helpers' earnings

### 5.2 Earnings Display
- [ ] Total earnings calculated correctly
- [ ] Individual job earnings shown
- [ ] Currency formatted as £ (not $)
- [ ] Dates formatted as dd/MM/yyyy (UK format)
- [ ] Customer name displayed
- [ ] Job amount displayed
- [ ] Helper payment amount displayed

### 5.3 Empty States
- [ ] Empty state shows when no earnings
- [ ] Message explains why earnings might be zero
- [ ] Message is helpful and actionable

### 5.4 Helper Visibility Rules
- [ ] Helpers only see assigned jobs
- [ ] Helpers cannot see owner financials
- [ ] Helpers cannot see GoCardless data
- [ ] Helpers cannot see other helpers' data
- [ ] Helpers cannot see customer list (only assigned jobs)

---

## 6. INVITE VALIDATION (AUTH FLOW)

### 6.1 Token Validation
- [ ] Token validated before processing
- [ ] Expired tokens detected
- [ ] Invalid tokens detected
- [ ] Already accepted tokens detected

### 6.2 Error Handling
- [ ] Network errors show retry option
- [ ] Error messages are user-friendly
- [ ] Errors don't crash the app

### 6.3 Retry Logic
- [ ] Retry button available for network errors
- [ ] Retry uses exponential backoff
- [ ] Retry doesn't create duplicate operations

### 6.4 URL Cleanup
- [ ] Token removed from URL after success
- [ ] Token removed from URL after error
- [ ] Clean URL after processing

### 6.5 Loading States
- [ ] Loading indicator during validation
- [ ] Form disabled during processing
- [ ] Button disabled during async operation

---

## 7. UI & UX IMPROVEMENTS

### 7.1 Currency Formatting
- [ ] All currency uses £ (not $)
- [ ] Currency formatting consistent
- [ ] Uses `formatCurrencyDecimal()` utility
- [ ] No hardcoded currency symbols

### 7.2 Date Formatting
- [ ] All dates use UK format (dd/MM/yyyy)
- [ ] Date formatting consistent
- [ ] Uses `format()` from date-fns with UK format
- [ ] No US date formats (MM/dd/yyyy)

### 7.3 Helper Status Badges
- [ ] Status badges show for all helpers
- [ ] Badges use correct colors
- [ ] Badges use utility functions
- [ ] Badge text is clear

### 7.4 Deactivation Dialog
- [ ] Dialog mentions assignment cleanup
- [ ] Dialog mentions billing stop
- [ ] Dialog mentions reactivation option
- [ ] Dialog is clear and informative

### 7.5 Loading States
- [ ] Loading states show for all async operations
- [ ] Buttons disabled during async operations
- [ ] Loading indicators are clear

---

## 8. CODE QUALITY

### 8.1 Helper Utility Functions
- [ ] `isPlaceholderHelper()` function exists
- [ ] `getHelperStatus()` function exists
- [ ] `getHelperStatusLabel()` function exists
- [ ] `getHelperStatusBadgeVariant()` function exists
- [ ] `validateHelperAssignment()` function exists
- [ ] `formatHelperName()` function exists
- [ ] `getHelperInitials()` function exists

### 8.2 TypeScript Types
- [ ] `HelperStatus` type exists
- [ ] `HelperStatusInfo` interface exists
- [ ] Types used consistently

### 8.3 Validation Logic
- [ ] Validation logic centralized
- [ ] No duplicate validation code
- [ ] Validation consistent across components

### 8.4 Error Messages
- [ ] Error messages are descriptive
- [ ] Error messages are actionable
- [ ] Error messages are user-friendly

---

## 9. RLS & SECURITY

### 9.1 Helper Job Updates
- [ ] RLS policy exists: "Helpers can update assigned jobs"
- [ ] Policy allows helpers to UPDATE assigned jobs
- [ ] Policy prevents helpers from updating non-assigned jobs
- [ ] Policy uses `job_assignments` table for validation

### 9.2 Helper Earnings Security
- [ ] Earnings query filters by assignment
- [ ] Helpers cannot see other helpers' earnings
- [ ] RLS prevents data leaks

### 9.3 Helper View of Jobs
- [ ] Helpers can only see assigned jobs
- [ ] RLS policy prevents seeing non-assigned jobs
- [ ] Policy is comprehensive

### 9.4 Owner Financials Protection
- [ ] Helpers cannot see owner financials
- [ ] Queries explicitly filter by assignment
- [ ] No data leaks

### 9.5 GoCardless Data Protection
- [ ] Helpers cannot see GoCardless data
- [ ] GoCardless data is owner-only
- [ ] No data leaks

---

## 10. PERFORMANCE & RELIABILITY

### 10.1 Race Conditions
- [ ] Unique constraint prevents duplicate assignments
- [ ] Upsert handles concurrent requests
- [ ] No race conditions in assignment creation

### 10.2 Defensive Checks
- [ ] Null checks exist where needed
- [ ] Validation exists before operations
- [ ] Edge cases handled

### 10.3 Button Disabling
- [ ] Buttons disabled during async operations
- [ ] No multiple submissions
- [ ] No duplicate operations

### 10.4 Error Recovery
- [ ] Retry logic for critical operations
- [ ] Error recovery doesn't crash app
- [ ] Errors are handled gracefully

### 10.5 Optimistic Updates
- [ ] Optimistic updates have rollback logic
- [ ] UI updates correctly on error
- [ ] No incorrect state after errors

---

## TESTING SCENARIOS

### Scenario 1: Complete Helper Flow
1. Owner creates helper
2. Owner sends invite
3. Helper accepts invite
4. Owner activates helper billing
5. Owner assigns job to helper
6. Helper completes job
7. Helper sees earnings
8. Owner deactivates helper
9. Helper no longer sees assigned jobs

**Expected:** All steps work correctly, no errors

### Scenario 2: Placeholder Helper
1. Owner creates placeholder helper
2. Owner tries to assign job
3. Error message shows
4. Helper signs up
5. Owner assigns job
6. Job assignment succeeds

**Expected:** Error on step 3, success on step 6

### Scenario 3: Deactivation Cleanup
1. Owner assigns multiple jobs to helper
2. Helper sees assigned jobs
3. Owner deactivates helper
4. Helper no longer sees assigned jobs
5. All assignments removed from database

**Expected:** All assignments removed, helper sees no jobs

### Scenario 4: Earnings Security
1. Helper A completes job
2. Helper B tries to see Helper A's earnings
3. Helper B only sees their own earnings

**Expected:** Helper B cannot see Helper A's earnings

---

## CRITICAL ISSUES TO VERIFY

### Must Pass (Blockers):
- [ ] Helpers can complete assigned jobs (RLS policy exists)
- [ ] Helper earnings query filters by assignment
- [ ] Null check for profile_id in payment calculation
- [ ] ALL assignments removed on deactivation

### Should Pass (High Priority):
- [ ] Invite flow works end-to-end
- [ ] Retry logic for network errors
- [ ] UK formatting (currency and dates)
- [ ] Helper status badges show correctly

---

## SIGN-OFF

**Tester:** _________________  
**Date:** _________________  
**Status:** ☐ Pass ☐ Fail  
**Notes:** _________________

---

**End of QA Checklist**

