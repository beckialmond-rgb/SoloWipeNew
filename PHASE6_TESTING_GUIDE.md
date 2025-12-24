# Phase 6: Testing & Quality Assurance Guide

## Overview
This phase ensures all features work correctly across different browsers, devices, and scenarios.

---

## Part 1: Functional Testing

### 1.1 Customer Management Testing

#### Create Customer
**Test Steps:**
1. Go to Customers page (`/customers`)
2. Click "Add Customer" button
3. Fill in form:
   - Name: "Test Customer"
   - Address: "123 Test Street"
   - Mobile Phone: "07123456789"
   - Price: £20
   - Frequency: 4 weeks
   - Notes: "Test notes"
4. Click "Add Customer"
5. Verify customer appears in list

**Expected Results:**
- ✅ Customer created successfully
- ✅ Customer appears in customer list
- ✅ Customer details are correct
- ✅ No errors in console
- ✅ Success message shown

**Test Cases:**
- [ ] Create customer with all fields
- [ ] Create customer with minimal fields (name, address)
- [ ] Create customer with special characters in name
- [ ] Create customer with long address
- [ ] Create customer with invalid phone number (should validate)
- [ ] Create customer with negative price (should validate)
- [ ] Create customer with zero frequency (should validate)

#### Update Customer
**Test Steps:**
1. Go to Customers page
2. Click on a customer card
3. Click "Edit" button
4. Modify customer details
5. Click "Save"
6. Verify changes saved

**Expected Results:**
- ✅ Customer updated successfully
- ✅ Changes reflected in customer list
- ✅ Changes persist after page refresh

**Test Cases:**
- [ ] Update customer name
- [ ] Update customer address
- [ ] Update customer phone number
- [ ] Update customer price
- [ ] Update customer frequency
- [ ] Update customer notes
- [ ] Cancel edit (should not save changes)

#### Archive Customer
**Test Steps:**
1. Go to Customers page
2. Click on a customer card
3. Click "Archive" button
4. Confirm archiving
5. Verify customer removed from active list

**Expected Results:**
- ✅ Customer archived successfully
- ✅ Customer removed from active list
- ✅ Customer status changed to "inactive"
- ✅ Related jobs cancelled (if applicable)

**Test Cases:**
- [ ] Archive customer with no jobs
- [ ] Archive customer with pending jobs
- [ ] Archive customer with completed jobs
- [ ] Verify archived customer doesn't appear in active list
- [ ] Verify can filter to see archived customers (if feature exists)

#### View Customer Details
**Test Steps:**
1. Go to Customers page
2. Click on a customer card
3. Verify customer details modal opens
4. Check all information displays correctly

**Expected Results:**
- ✅ Customer details modal opens
- ✅ All customer information displayed
- ✅ Job history shown (if applicable)
- ✅ Direct Debit status shown (if applicable)

---

### 1.2 Job Management Testing

#### Create Job
**Test Steps:**
1. Go to Customers page
2. Select a customer
3. Click "Schedule Job" or similar
4. Select date
5. Add notes (optional)
6. Click "Create Job"
7. Verify job appears in calendar/list

**Expected Results:**
- ✅ Job created successfully
- ✅ Job appears in calendar
- ✅ Job appears in pending jobs list
- ✅ Job scheduled date is correct

**Test Cases:**
- [ ] Create job for today
- [ ] Create job for future date
- [ ] Create job with notes
- [ ] Create job without notes
- [ ] Create multiple jobs for same customer
- [ ] Create job for archived customer (should fail or handle gracefully)

#### Complete Job
**Test Steps:**
1. Go to Home page (`/`)
2. Find a pending job
3. Click "Complete" button
4. Verify job marked as completed
5. Verify job appears in completed jobs

**Expected Results:**
- ✅ Job marked as completed
- ✅ Job removed from pending list
- ✅ Job appears in completed jobs
- ✅ Payment status updated (if applicable)
- ✅ Earnings updated

**Test Cases:**
- [ ] Complete job with payment
- [ ] Complete job without payment
- [ ] Complete job with Direct Debit customer (auto-payment)
- [ ] Complete job and mark as paid
- [ ] Complete job and add notes
- [ ] Upload photo when completing job

#### Reschedule Job
**Test Steps:**
1. Go to Home page or Calendar
2. Find a pending job
3. Click "Reschedule" button
4. Select new date
5. Click "Save"
6. Verify job date updated

**Expected Results:**
- ✅ Job rescheduled successfully
- ✅ New date reflected in calendar
- ✅ Job still in pending status

**Test Cases:**
- [ ] Reschedule to future date
- [ ] Reschedule to today
- [ ] Reschedule multiple times
- [ ] Cancel reschedule (should not change date)

#### Skip Job
**Test Steps:**
1. Go to Home page
2. Find a pending job
3. Click "Skip" button
4. Confirm skip
5. Verify job removed from pending

**Expected Results:**
- ✅ Job skipped successfully
- ✅ Job removed from pending list
- ✅ Next job scheduled (if applicable)

**Test Cases:**
- [ ] Skip single job
- [ ] Skip job and verify next scheduled
- [ ] Undo skip (if feature exists)

#### Mark Job as Paid
**Test Steps:**
1. Go to Home page or Money page
2. Find a completed unpaid job
3. Click "Mark as Paid" button
4. Select payment method
5. Verify job marked as paid

**Expected Results:**
- ✅ Job marked as paid
- ✅ Payment status updated
- ✅ Payment method recorded
- ✅ Earnings updated

**Test Cases:**
- [ ] Mark job as paid with cash
- [ ] Mark job as paid with bank transfer
- [ ] Mark job as paid with Direct Debit (should be automatic)
- [ ] Mark multiple jobs as paid

---

### 1.3 Calendar Testing

#### View Calendar
**Test Steps:**
1. Go to Calendar page (`/calendar`)
2. Verify calendar displays
3. Check jobs appear on correct dates
4. Navigate between months

**Expected Results:**
- ✅ Calendar displays correctly
- ✅ Jobs appear on scheduled dates
- ✅ Can navigate between months
- ✅ Current date highlighted

**Test Cases:**
- [ ] View current month
- [ ] Navigate to previous month
- [ ] Navigate to next month
- [ ] View jobs on different dates
- [ ] Filter jobs by status (if feature exists)
- [ ] Click on date to see jobs

#### Quick Add Customer from Calendar
**Test Steps:**
1. Go to Calendar page
2. Click "Add Customer" button
3. Fill in customer form
4. Create customer
5. Verify customer appears

**Expected Results:**
- ✅ Customer created successfully
- ✅ Can schedule job immediately
- ✅ Customer appears in customer list

---

### 1.4 Earnings Dashboard Testing

#### View Earnings
**Test Steps:**
1. Go to Earnings page (`/earnings`)
2. Verify earnings data displays
3. Check charts/graphs render
4. Filter by date range

**Expected Results:**
- ✅ Earnings data displays correctly
- ✅ Charts render properly
- ✅ Totals are accurate
- ✅ Can filter by date range

**Test Cases:**
- [ ] View today's earnings
- [ ] View this week's earnings
- [ ] View this month's earnings
- [ ] View custom date range
- [ ] Export earnings data (if feature exists)
- [ ] View earnings breakdown by payment method

---

### 1.5 Settings Page Testing

#### Update Business Name
**Test Steps:**
1. Go to Settings page (`/settings`)
2. Find business name field
3. Update business name
4. Save changes
5. Verify name updated

**Expected Results:**
- ✅ Business name updated
- ✅ Changes persist
- ✅ Name appears throughout app

#### Connect GoCardless
**Test Steps:**
1. Go to Settings page
2. Find GoCardless section
3. Click "Connect GoCardless"
4. Complete OAuth flow
5. Verify connection successful

**Expected Results:**
- ✅ OAuth flow completes
- ✅ GoCardless connected
- ✅ Connection status shows "Connected"
- ✅ Can create mandates

**Test Cases:**
- [ ] Connect GoCardless account
- [ ] Disconnect GoCardless account
- [ ] Reconnect GoCardless account
- [ ] Verify connection persists

#### Manage Subscription
**Test Steps:**
1. Go to Settings page
2. Find Subscription section
3. Click "Subscribe" or "Manage Subscription"
4. Complete Stripe checkout
5. Verify subscription active

**Expected Results:**
- ✅ Checkout flow works
- ✅ Subscription activates
- ✅ Subscription status updated
- ✅ Can access customer portal

**Test Cases:**
- [ ] Subscribe to monthly plan
- [ ] Subscribe to annual plan
- [ ] Access customer portal
- [ ] Cancel subscription
- [ ] Reactivate subscription

#### Export Data
**Test Steps:**
1. Go to Settings page
2. Find Export section
3. Click "Export Data"
4. Download CSV file
5. Verify data exported correctly

**Expected Results:**
- ✅ Data exports successfully
- ✅ CSV file downloads
- ✅ Data is complete and accurate

#### Sign Out
**Test Steps:**
1. Go to Settings page
2. Click "Sign Out" button
3. Verify logged out
4. Verify redirect to auth page

**Expected Results:**
- ✅ Session cleared
- ✅ Redirected to `/auth`
- ✅ Protected routes blocked

---

## Part 2: Cross-Browser Testing

### Browsers to Test

#### Chrome (Desktop & Mobile)
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable

#### Firefox (Desktop & Mobile)
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable

#### Safari (Desktop & Mobile)
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] PWA installation works

#### Edge (Desktop)
- [ ] All features work
- [ ] UI renders correctly
- [ ] No console errors

### Browser-Specific Issues to Check

- [ ] **Date pickers** work in all browsers
- [ ] **File uploads** work in all browsers
- [ ] **Local storage** works in all browsers
- [ ] **Service worker** works in all browsers
- [ ] **PWA installation** works (especially Safari)

---

## Part 3: Device Testing

### Desktop Testing

#### Screen Sizes
- [ ] **1920x1080** (Full HD)
- [ ] **1366x768** (Common laptop)
- [ ] **2560x1440** (2K)
- [ ] **3840x2160** (4K)

**Test Cases:**
- [ ] Layout adapts correctly
- [ ] Text readable
- [ ] Buttons clickable
- [ ] No horizontal scrolling

### Tablet Testing

#### Devices
- [ ] **iPad** (iOS Safari)
- [ ] **Android Tablet** (Chrome)

**Test Cases:**
- [ ] Touch interactions work
- [ ] Layout adapts to tablet size
- [ ] PWA installation works
- [ ] Keyboard appears correctly

### Mobile Testing

#### Devices
- [ ] **iPhone** (iOS Safari)
- [ ] **Android Phone** (Chrome)

**Test Cases:**
- [ ] Touch interactions work
- [ ] Mobile navigation works
- [ ] Forms are usable
- [ ] PWA installation works
- [ ] Offline functionality works
- [ ] Push notifications work (if implemented)

---

## Part 4: Performance Testing

### Page Load Times

**Target Metrics:**
- ✅ Page load < 3 seconds
- ✅ Time to interactive < 5 seconds
- ✅ First contentful paint < 1.5 seconds

**Test Tools:**
- Chrome DevTools Lighthouse
- WebPageTest
- GTmetrix

**Test Cases:**
- [ ] Home page load time
- [ ] Customers page load time
- [ ] Calendar page load time
- [ ] Settings page load time

### Bundle Size

**Target Metrics:**
- ✅ JavaScript bundle < 2MB (gzipped)
- ✅ CSS bundle < 100KB (gzipped)
- ✅ Total assets < 3MB

**Check Current Size:**
```bash
npm run build
# Check dist/assets/ folder sizes
```

**Current Status:**
- JavaScript: ~445KB gzipped ✅
- CSS: ~13.56KB gzipped ✅
- Total: Well under limits ✅

### Lighthouse Scores

**Target Scores:**
- ✅ Performance: > 90
- ✅ Accessibility: > 90
- ✅ Best Practices: > 90
- ✅ SEO: > 90

**Test Steps:**
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Review scores and recommendations

---

## Part 5: Offline Functionality Testing

### Offline Features

#### Test Scenarios

**1. Create Data Offline**
- [ ] Go offline (disable network)
- [ ] Create customer
- [ ] Create job
- [ ] Complete job
- [ ] Go online
- [ ] Verify data syncs

**2. View Data Offline**
- [ ] Load app while online
- [ ] Go offline
- [ ] Verify can view customers
- [ ] Verify can view jobs
- [ ] Verify can view calendar

**3. Sync When Back Online**
- [ ] Make changes offline
- [ ] Go back online
- [ ] Verify offline indicator disappears
- [ ] Verify changes sync
- [ ] Verify no conflicts

**4. Offline Indicator**
- [ ] Go offline
- [ ] Verify offline indicator shows
- [ ] Verify indicator is visible
- [ ] Go online
- [ ] Verify indicator disappears

### Service Worker Testing

**Test Cases:**
- [ ] Service worker registers
- [ ] App works offline
- [ ] Service worker updates correctly
- [ ] Cache works properly
- [ ] Old cache cleared on update

---

## Part 6: PWA Testing

### Installation Testing

**Desktop:**
- [ ] Install prompt appears
- [ ] Can install from browser menu
- [ ] App installs successfully
- [ ] App icon appears on desktop
- [ ] App opens in standalone window

**Mobile:**
- [ ] Install prompt appears (iOS Safari)
- [ ] Can install from share menu (iOS)
- [ ] Can install from browser menu (Android)
- [ ] App installs successfully
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode

### PWA Features

**Test Cases:**
- [ ] App works offline after installation
- [ ] Splash screen displays
- [ ] App icon displays correctly
- [ ] Theme color applied
- [ ] App updates automatically

---

## Part 7: Error Handling Testing

### Error Scenarios

**Network Errors:**
- [ ] Handle network timeout
- [ ] Handle network failure
- [ ] Show appropriate error message
- [ ] Allow retry

**Validation Errors:**
- [ ] Invalid email format
- [ ] Invalid phone number
- [ ] Missing required fields
- [ ] Invalid date range

**Authentication Errors:**
- [ ] Expired session
- [ ] Invalid credentials
- [ ] Unauthorized access
- [ ] Profile not found

**API Errors:**
- [ ] 400 Bad Request
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 500 Server Error

---

## Testing Checklist Summary

### Functional Testing
- [ ] Customer management (create, update, archive, view)
- [ ] Job management (create, complete, reschedule, skip, mark paid)
- [ ] Calendar functionality
- [ ] Earnings dashboard
- [ ] Settings page

### Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

### Device Testing
- [ ] Desktop (multiple screen sizes)
- [ ] Tablet (iPad, Android)
- [ ] Mobile (iPhone, Android)

### Performance Testing
- [ ] Page load times < 3 seconds
- [ ] Bundle size acceptable
- [ ] Lighthouse scores > 90

### Offline Testing
- [ ] Create data offline
- [ ] View data offline
- [ ] Sync when back online
- [ ] Offline indicator works

### PWA Testing
- [ ] Installation works
- [ ] App works offline
- [ ] Updates correctly

---

## Test Report Template

### Test Execution Log

**Date:** _______________
**Tester:** _______________
**Environment:** _______________

#### Functional Tests
- [ ] Customer Management: Pass / Fail / Notes: _______________
- [ ] Job Management: Pass / Fail / Notes: _______________
- [ ] Calendar: Pass / Fail / Notes: _______________
- [ ] Earnings: Pass / Fail / Notes: _______________
- [ ] Settings: Pass / Fail / Notes: _______________

#### Browser Tests
- [ ] Chrome: Pass / Fail / Notes: _______________
- [ ] Firefox: Pass / Fail / Notes: _______________
- [ ] Safari: Pass / Fail / Notes: _______________
- [ ] Edge: Pass / Fail / Notes: _______________

#### Device Tests
- [ ] Desktop: Pass / Fail / Notes: _______________
- [ ] Tablet: Pass / Fail / Notes: _______________
- [ ] Mobile: Pass / Fail / Notes: _______________

#### Performance Tests
- [ ] Load Times: Pass / Fail / Notes: _______________
- [ ] Bundle Size: Pass / Fail / Notes: _______________
- [ ] Lighthouse: Pass / Fail / Notes: _______________

#### Offline Tests
- [ ] Offline Functionality: Pass / Fail / Notes: _______________
- [ ] Sync: Pass / Fail / Notes: _______________

#### PWA Tests
- [ ] Installation: Pass / Fail / Notes: _______________
- [ ] Offline Mode: Pass / Fail / Notes: _______________

### Issues Found

1. **Issue:** _______________
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

2. **Issue:** _______________
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

---

## Next Steps

After completing all tests:

1. ✅ Document all issues found
2. ✅ Prioritize issues (Critical → Low)
3. ✅ Fix critical issues
4. ✅ Retest fixed issues
5. ✅ Move to Phase 7: Performance Optimization

---

## Testing Tools

### Recommended Tools
- **Chrome DevTools** - Performance, debugging
- **Lighthouse** - Performance audit
- **BrowserStack** - Cross-browser testing
- **WebPageTest** - Performance testing
- **Postman** - API testing (if needed)

### Browser Extensions
- **React DevTools** - React debugging
- **Redux DevTools** - State debugging (if using Redux)
