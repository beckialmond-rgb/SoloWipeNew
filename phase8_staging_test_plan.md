# Phase 8: Staging Test Plan

## Test Execution Log

**Date:** _______________
**Tester:** _______________
**Environment:** Staging
**URL:** _______________

---

## 1. Authentication Testing

### Signup Flow
- [ ] Navigate to signup page
- [ ] Enter valid email, password, business name
- [ ] Submit form
- [ ] Verify email confirmation sent (if enabled)
- [ ] Complete email confirmation
- [ ] Verify profile created
- [ ] Verify redirect to app

**Result:** Pass / Fail
**Notes:** _______________

### Login Flow
- [ ] Navigate to login page
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify login successful
- [ ] Verify session persists
- [ ] Verify redirect to home

**Result:** Pass / Fail
**Notes:** _______________

### Logout Flow
- [ ] Click sign out
- [ ] Verify session cleared
- [ ] Verify redirect to auth page
- [ ] Verify protected routes blocked

**Result:** Pass / Fail
**Notes:** _______________

### Password Reset
- [ ] Navigate to forgot password
- [ ] Enter email
- [ ] Verify reset email sent
- [ ] Click reset link
- [ ] Enter new password
- [ ] Verify password changed
- [ ] Login with new password

**Result:** Pass / Fail
**Notes:** _______________

---

## 2. Customer Management Testing

### Create Customer
- [ ] Navigate to Customers page
- [ ] Click "Add Customer"
- [ ] Fill in all fields
- [ ] Submit form
- [ ] Verify customer created
- [ ] Verify customer appears in list
- [ ] Verify customer details correct

**Result:** Pass / Fail
**Notes:** _______________

### Update Customer
- [ ] Click on customer card
- [ ] Click "Edit"
- [ ] Modify details
- [ ] Save changes
- [ ] Verify changes saved
- [ ] Verify changes persist after refresh

**Result:** Pass / Fail
**Notes:** _______________

### Archive Customer
- [ ] Click on customer card
- [ ] Click "Archive"
- [ ] Confirm archiving
- [ ] Verify customer removed from active list
- [ ] Verify customer status changed

**Result:** Pass / Fail
**Notes:** _______________

### View Customer Details
- [ ] Click on customer card
- [ ] Verify details modal opens
- [ ] Verify all information displayed
- [ ] Verify job history shown (if applicable)

**Result:** Pass / Fail
**Notes:** _______________

---

## 3. Job Management Testing

### Create Job
- [ ] Select customer
- [ ] Click "Schedule Job"
- [ ] Select date
- [ ] Add notes (optional)
- [ ] Create job
- [ ] Verify job appears in calendar
- [ ] Verify job appears in pending list

**Result:** Pass / Fail
**Notes:** _______________

### Complete Job
- [ ] Find pending job
- [ ] Click "Complete"
- [ ] Verify job marked as completed
- [ ] Verify job removed from pending
- [ ] Verify earnings updated

**Result:** Pass / Fail
**Notes:** _______________

### Reschedule Job
- [ ] Find pending job
- [ ] Click "Reschedule"
- [ ] Select new date
- [ ] Save
- [ ] Verify date updated
- [ ] Verify job still pending

**Result:** Pass / Fail
**Notes:** _______________

### Skip Job
- [ ] Find pending job
- [ ] Click "Skip"
- [ ] Confirm skip
- [ ] Verify job removed from pending
- [ ] Verify next job scheduled (if applicable)

**Result:** Pass / Fail
**Notes:** _______________

### Mark Job as Paid
- [ ] Find completed unpaid job
- [ ] Click "Mark as Paid"
- [ ] Select payment method
- [ ] Verify job marked as paid
- [ ] Verify payment status updated

**Result:** Pass / Fail
**Notes:** _______________

---

## 4. Calendar Testing

### View Calendar
- [ ] Navigate to Calendar page
- [ ] Verify calendar displays
- [ ] Verify jobs appear on correct dates
- [ ] Navigate between months
- [ ] Verify current date highlighted

**Result:** Pass / Fail
**Notes:** _______________

### Calendar Navigation
- [ ] Navigate to next month
- [ ] Navigate to previous month
- [ ] Click on date
- [ ] Verify jobs for that date shown

**Result:** Pass / Fail
**Notes:** _______________

---

## 5. Earnings Testing

### View Earnings
- [ ] Navigate to Earnings page
- [ ] Verify earnings data displays
- [ ] Verify charts render
- [ ] Filter by date range
- [ ] Verify totals accurate

**Result:** Pass / Fail
**Notes:** _______________

### Export Earnings
- [ ] Click "Export Data"
- [ ] Download CSV
- [ ] Verify file downloads
- [ ] Verify data accurate

**Result:** Pass / Fail
**Notes:** _______________

---

## 6. Settings Testing

### Update Business Name
- [ ] Navigate to Settings
- [ ] Update business name
- [ ] Save
- [ ] Verify name updated
- [ ] Verify name appears throughout app

**Result:** Pass / Fail
**Notes:** _______________

### GoCardless Connection
- [ ] Navigate to GoCardless section
- [ ] Click "Connect GoCardless"
- [ ] Complete OAuth flow
- [ ] Verify connection successful
- [ ] Verify connection status shows

**Result:** Pass / Fail
**Notes:** _______________

### Subscription Management
- [ ] Navigate to Subscription section
- [ ] Click "Subscribe"
- [ ] Complete Stripe checkout (test mode)
- [ ] Verify subscription activates
- [ ] Test customer portal access

**Result:** Pass / Fail
**Notes:** _______________

---

## 7. Cross-Browser Testing

### Chrome
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable

**Result:** Pass / Fail
**Notes:** _______________

### Firefox
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable

**Result:** Pass / Fail
**Notes:** _______________

### Safari
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] PWA installation works

**Result:** Pass / Fail
**Notes:** _______________

### Edge
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors

**Result:** Pass / Fail
**Notes:** _______________

---

## 8. Mobile Testing

### iPhone
- [ ] All features work
- [ ] Touch interactions work
- [ ] Mobile navigation works
- [ ] Forms usable
- [ ] PWA installation works

**Result:** Pass / Fail
**Notes:** _______________

### Android
- [ ] All features work
- [ ] Touch interactions work
- [ ] Mobile navigation works
- [ ] Forms usable
- [ ] PWA installation works

**Result:** Pass / Fail
**Notes:** _______________

---

## 9. Performance Testing

### Page Load Times
- [ ] Home page < 3 seconds
- [ ] Customers page < 3 seconds
- [ ] Calendar page < 3 seconds
- [ ] Settings page < 3 seconds

**Result:** Pass / Fail
**Notes:** _______________

### Lighthouse Scores
- [ ] Performance > 90
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 90

**Result:** Pass / Fail
**Notes:** _______________

---

## 10. Security Testing

### Authentication
- [ ] Cannot access without login
- [ ] Session expires correctly
- [ ] Logout works
- [ ] Password reset works

**Result:** Pass / Fail
**Notes:** _______________

### Authorization
- [ ] Cannot access other users' data
- [ ] RLS policies enforced
- [ ] API calls authenticated

**Result:** Pass / Fail
**Notes:** _______________

### HTTPS
- [ ] HTTPS enforced
- [ ] No mixed content
- [ ] SSL certificate valid

**Result:** Pass / Fail
**Notes:** _______________

---

## Issues Found

### Critical Issues
1. **Issue:** _______________
   - **Severity:** Critical
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

### High Priority Issues
1. **Issue:** _______________
   - **Severity:** High
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

### Medium Priority Issues
1. **Issue:** _______________
   - **Severity:** Medium
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

### Low Priority Issues
1. **Issue:** _______________
   - **Severity:** Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

---

## Test Summary

**Total Tests:** _______________
**Passed:** _______________
**Failed:** _______________
**Blocked:** _______________

**Critical Issues:** _______________
**High Priority Issues:** _______________
**Medium Priority Issues:** _______________
**Low Priority Issues:** _______________

---

## Approval

**Staging Approved:** Yes / No
**Date:** _______________
**Approved by:** _______________
**Notes:** _______________

---

## Sign-Off

**Ready for Production:** Yes / No
**Date:** _______________
**Signed:** _______________
