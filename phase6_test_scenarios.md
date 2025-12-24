# Phase 6: Detailed Test Scenarios

## Scenario 1: New User Onboarding Flow

### Steps:
1. User visits app for first time
2. User clicks "Sign up"
3. User enters email, password, business name
4. User confirms email (if required)
5. User logs in
6. User sees welcome tour/tutorial
7. User creates first customer
8. User schedules first job

### Expected Results:
- ✅ Signup successful
- ✅ Email confirmation sent (if enabled)
- ✅ Profile created automatically
- ✅ Welcome flow shown
- ✅ Can create customer
- ✅ Can schedule job

### Test Cases:
- [ ] Signup with valid email
- [ ] Signup with invalid email (should show error)
- [ ] Signup with weak password (should validate)
- [ ] Email confirmation works
- [ ] Welcome tour displays
- [ ] Can skip welcome tour
- [ ] First customer creation works

---

## Scenario 2: Daily Workflow - Complete Jobs

### Steps:
1. User logs in
2. User views pending jobs for today
3. User completes first job
4. User marks job as paid
5. User completes second job
6. User views earnings for today
7. User exports earnings data

### Expected Results:
- ✅ Pending jobs displayed
- ✅ Jobs can be completed
- ✅ Jobs can be marked as paid
- ✅ Earnings updated correctly
- ✅ Data can be exported

### Test Cases:
- [ ] View pending jobs
- [ ] Complete job with payment
- [ ] Complete job without payment
- [ ] Mark job as paid later
- [ ] View earnings summary
- [ ] Export earnings CSV

---

## Scenario 3: Customer Management Workflow

### Steps:
1. User creates new customer
2. User sets up Direct Debit for customer
3. User schedules recurring jobs
4. User views customer history
5. User updates customer details
6. User archives customer

### Expected Results:
- ✅ Customer created
- ✅ Direct Debit setup works
- ✅ Jobs scheduled automatically
- ✅ Customer history shows
- ✅ Updates save correctly
- ✅ Archiving works

### Test Cases:
- [ ] Create customer with all fields
- [ ] Set up Direct Debit mandate
- [ ] Verify mandate created
- [ ] Schedule recurring jobs
- [ ] View customer job history
- [ ] Update customer information
- [ ] Archive customer (verify jobs cancelled)

---

## Scenario 4: Payment Collection Flow

### Steps:
1. User has customer with Direct Debit mandate
2. User completes job for customer
3. Payment collected automatically
4. User views payment status
5. User views earnings

### Expected Results:
- ✅ Payment collected automatically
- ✅ Payment status updated
- ✅ Job marked as paid
- ✅ Earnings updated
- ✅ Payment appears in earnings

### Test Cases:
- [ ] Complete job for DD customer
- [ ] Verify payment collected
- [ ] Check payment status in database
- [ ] View payment in earnings
- [ ] Handle payment failure (if applicable)

---

## Scenario 5: Subscription Management Flow

### Steps:
1. User views subscription options
2. User selects monthly plan
3. User completes Stripe checkout
4. User's subscription activates
5. User accesses all features
6. User manages subscription via portal

### Expected Results:
- ✅ Subscription options shown
- ✅ Checkout flow works
- ✅ Subscription activates
- ✅ Features unlocked
- ✅ Customer portal accessible

### Test Cases:
- [ ] View subscription tiers
- [ ] Select monthly plan
- [ ] Select annual plan
- [ ] Complete checkout
- [ ] Verify subscription active
- [ ] Access customer portal
- [ ] Cancel subscription
- [ ] Reactivate subscription

---

## Scenario 6: Calendar Navigation Flow

### Steps:
1. User opens calendar
2. User navigates to next month
3. User navigates to previous month
4. User clicks on date
5. User views jobs for that date
6. User reschedules job from calendar
7. User creates new job from calendar

### Expected Results:
- ✅ Calendar displays correctly
- ✅ Navigation works
- ✅ Jobs appear on correct dates
- ✅ Can view job details
- ✅ Can reschedule from calendar
- ✅ Can create jobs from calendar

### Test Cases:
- [ ] Navigate months forward
- [ ] Navigate months backward
- [ ] View jobs on specific date
- [ ] Reschedule job from calendar
- [ ] Create job from calendar
- [ ] Filter jobs by status (if feature exists)

---

## Scenario 7: Offline Usage Flow

### Steps:
1. User opens app while online
2. User views customers and jobs
3. User goes offline (disables network)
4. User creates customer offline
5. User completes job offline
6. User goes back online
7. Data syncs automatically

### Expected Results:
- ✅ App works offline
- ✅ Can view cached data
- ✅ Can create data offline
- ✅ Offline indicator shows
- ✅ Data syncs when online
- ✅ No data loss

### Test Cases:
- [ ] Load app offline
- [ ] View cached data
- [ ] Create customer offline
- [ ] Complete job offline
- [ ] Verify offline indicator
- [ ] Sync when back online
- [ ] Handle sync conflicts

---

## Scenario 8: Error Recovery Flow

### Steps:
1. User performs action
2. Network error occurs
3. Error message displayed
4. User retries action
5. Action succeeds

### Expected Results:
- ✅ Error handled gracefully
- ✅ User-friendly error message
- ✅ Can retry action
- ✅ No data loss
- ✅ App remains functional

### Test Cases:
- [ ] Network timeout
- [ ] Network failure
- [ ] API error (400, 401, 403, 500)
- [ ] Validation error
- [ ] Retry functionality
- [ ] Error recovery

---

## Scenario 9: Multi-Device Usage Flow

### Steps:
1. User logs in on desktop
2. User creates customer
3. User logs in on mobile
4. User views same customer
5. User updates customer on mobile
6. User views update on desktop

### Expected Results:
- ✅ Data syncs across devices
- ✅ Changes visible on all devices
- ✅ No conflicts
- ✅ Session works on both devices

### Test Cases:
- [ ] Login on multiple devices
- [ ] Create data on device A
- [ ] View data on device B
- [ ] Update data on device B
- [ ] Verify update on device A
- [ ] Handle simultaneous edits

---

## Scenario 10: Data Export Flow

### Steps:
1. User goes to Settings
2. User clicks "Export Data"
3. User selects data to export
4. User downloads CSV file
5. User opens CSV file
6. User verifies data accuracy

### Expected Results:
- ✅ Export works
- ✅ CSV file downloads
- ✅ Data is complete
- ✅ Data is accurate
- ✅ Format is correct

### Test Cases:
- [ ] Export customers
- [ ] Export jobs
- [ ] Export earnings
- [ ] Verify CSV format
- [ ] Verify data accuracy
- [ ] Handle large exports

---

## Edge Cases to Test

### Input Validation
- [ ] Empty fields
- [ ] Special characters
- [ ] Very long text
- [ ] Negative numbers
- [ ] Zero values
- [ ] Invalid dates
- [ ] Invalid email formats
- [ ] Invalid phone numbers

### Boundary Conditions
- [ ] Maximum number of customers
- [ ] Maximum number of jobs
- [ ] Very old dates
- [ ] Very future dates
- [ ] Very large prices
- [ ] Very small prices

### Error Conditions
- [ ] Network failure during save
- [ ] Session expiry during use
- [ ] Concurrent edits
- [ ] Deleted resource access
- [ ] Invalid API responses

---

## Performance Test Scenarios

### Large Dataset
- [ ] 100+ customers
- [ ] 1000+ jobs
- [ ] Calendar with many jobs
- [ ] Earnings with many transactions

### Slow Network
- [ ] 3G throttling
- [ ] Slow 3G throttling
- [ ] Offline mode
- [ ] Intermittent connectivity

### Heavy Usage
- [ ] Multiple rapid actions
- [ ] Many concurrent requests
- [ ] Large data exports
- [ ] Complex queries

---

## Accessibility Test Scenarios

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space to activate buttons
- [ ] Escape to close modals
- [ ] Arrow keys in lists

### Screen Reader
- [ ] All content readable
- [ ] Buttons labeled correctly
- [ ] Forms accessible
- [ ] Navigation clear

### Visual
- [ ] High contrast mode
- [ ] Text scaling
- [ ] Color blind friendly
- [ ] Focus indicators visible

---

## Security Test Scenarios

### Authentication
- [ ] Cannot access without login
- [ ] Session expires correctly
- [ ] Logout works
- [ ] Password reset works

### Authorization
- [ ] Cannot access other users' data
- [ ] RLS policies enforced
- [ ] API calls authenticated
- [ ] Edge functions secured

### Data Protection
- [ ] Sensitive data encrypted
- [ ] No secrets in client code
- [ ] HTTPS enforced
- [ ] Input sanitized
