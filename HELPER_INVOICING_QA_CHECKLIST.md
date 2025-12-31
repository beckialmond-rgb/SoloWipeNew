# Helper Invoicing & Payment System - QA Checklist
**Date:** 2025-02-11  
**Status:** Ready for Testing  
**System:** Complete Helper Invoicing & Payment System

---

## Pre-Testing Setup

### 1. Database Migrations
- [ ] Run migration: `20250211000000_create_helper_invoicing_system.sql`
- [ ] Run migration: `20250211000001_create_helper_invoice_functions.sql`
- [ ] Verify all tables created: `helper_invoices`, `helper_invoice_items`, `helper_payments`, `helper_invoice_audit_log`
- [ ] Verify all functions created: `generate_helper_invoice`, `issue_helper_invoice`, `record_helper_payment`, `get_helper_invoice_summary`, `get_jobs_available_for_invoicing`
- [ ] Verify RLS policies are active
- [ ] Verify triggers are active

### 2. Test Accounts
- [ ] Create owner account
- [ ] Create helper account (assigned to owner)
- [ ] Create completed jobs with `helper_payment_amount` set
- [ ] Verify helper has commission percentage set in `team_members`

---

## 1. INVOICE GENERATION

### 1.1 Generate Weekly Invoice
- [ ] Owner can open "Generate Invoice" modal
- [ ] Owner can select helper from dropdown
- [ ] Owner can select "Weekly" period type
- [ ] Owner can select "Previous Week" period
- [ ] Invoice is created with correct period dates
- [ ] Invoice number follows format: `HELPER-{helper_id_short}-{period}-{sequence}`
- [ ] Invoice status is "draft"
- [ ] Invoice includes all completed jobs in period with `helper_payment_amount`
- [ ] Invoice totals are calculated correctly
- [ ] Success toast appears after generation

### 1.2 Generate Monthly Invoice
- [ ] Owner can select "Monthly" period type
- [ ] Owner can select "Previous Month" period
- [ ] Invoice is created with correct month dates
- [ ] Invoice includes all completed jobs in month
- [ ] Invoice totals are calculated correctly

### 1.3 Generate Custom Period Invoice
- [ ] Owner can select "Custom Range" period option
- [ ] Owner can set custom start date
- [ ] Owner can set custom end date
- [ ] Invoice is created with custom dates
- [ ] Only jobs completed within custom range are included

### 1.4 Invoice Generation Validation
- [ ] Cannot generate invoice if no jobs available for period
- [ ] Cannot generate duplicate invoice for same period
- [ ] Error message shows if invoice already exists
- [ ] Error message shows if no jobs found
- [ ] Jobs already invoiced are excluded from new invoices

### 1.5 Invoice Line Items
- [ ] Each completed job appears as line item
- [ ] Line items show: date, customer name, job amount, helper payment amount
- [ ] Line items are ordered by completion date
- [ ] Subtotal equals sum of all helper payment amounts
- [ ] Total equals subtotal (no tax/fees)

---

## 2. INVOICE ISSUING

### 2.1 Issue Draft Invoice
- [ ] Owner can issue draft invoice from detail modal
- [ ] Invoice status changes from "draft" to "issued"
- [ ] `issued_at` timestamp is set
- [ ] Invoice is locked (cannot be modified)
- [ ] Success toast appears
- [ ] Audit log entry created

### 2.2 Issued Invoice Locking
- [ ] Issued invoices cannot be edited
- [ ] Line items cannot be added/removed from issued invoices
- [ ] Invoice totals cannot be changed
- [ ] Only payments can be recorded for issued invoices

### 2.3 Invoice Status Flow
- [ ] Draft → Issued (via issue action)
- [ ] Issued → Paid (automatically when fully paid)
- [ ] Status updates correctly when payment recorded

---

## 3. PAYMENT RECORDING

### 3.1 Record Full Payment
- [ ] Owner can open "Record Payment" modal from invoice detail
- [ ] Owner can set payment date
- [ ] Owner can select payment method (bank_transfer, cash, cheque, other)
- [ ] Owner can enter payment amount
- [ ] Owner can enter payment reference (optional)
- [ ] Owner can enter notes (optional)
- [ ] Payment is recorded successfully
- [ ] Invoice `amount_paid` updates correctly
- [ ] Invoice `outstanding_balance` updates correctly
- [ ] Invoice status changes to "paid" when fully paid
- [ ] `paid_at` timestamp is set when fully paid
- [ ] Success toast appears
- [ ] Audit log entry created

### 3.2 Record Partial Payment
- [ ] Owner can record payment less than outstanding balance
- [ ] Invoice status remains "issued" (not "paid")
- [ ] Outstanding balance updates correctly
- [ ] Multiple partial payments can be recorded
- [ ] Total payments sum correctly

### 3.3 Payment Validation
- [ ] Cannot record payment for draft invoice
- [ ] Cannot record payment with amount <= 0
- [ ] Warning shown if amount exceeds outstanding balance
- [ ] Payment date is required
- [ ] Payment method is required

### 3.4 Payment Methods
- [ ] Bank transfer payment recorded correctly
- [ ] Cash payment recorded correctly
- [ ] Cheque payment recorded correctly
- [ ] Other payment method recorded correctly
- [ ] Payment reference stored correctly
- [ ] Notes stored correctly

---

## 4. INVOICE VIEWING (OWNER)

### 4.1 Invoice List
- [ ] Owner can view all invoices at `/helper-invoices`
- [ ] Invoices are sorted by creation date (newest first)
- [ ] Summary cards show: Total Invoices, Total Amount, Total Paid, Outstanding
- [ ] Summary calculations are correct
- [ ] Status badges display correctly (draft, issued, paid, cancelled)
- [ ] Helper name displays correctly
- [ ] Period dates display in UK format (dd/MM/yyyy)
- [ ] Amounts display in UK format (£)

### 4.2 Invoice Filtering
- [ ] Owner can filter by helper (All Helpers or specific helper)
- [ ] Owner can filter by status (All Status, Draft, Issued, Paid, Cancelled)
- [ ] Filters work together (AND logic)
- [ ] Filtered results update correctly
- [ ] Empty state shows when no invoices match filters

### 4.3 Invoice Detail View
- [ ] Owner can click invoice to view details
- [ ] Invoice detail modal shows all invoice information
- [ ] Line items table displays correctly
- [ ] Payment history displays correctly
- [ ] Totals display correctly
- [ ] Export CSV button works
- [ ] Issue Invoice button shows for draft invoices
- [ ] Record Payment button shows for issued invoices with outstanding balance

---

## 5. INVOICE VIEWING (HELPER)

### 5.1 Helper Invoice List
- [ ] Helper can view own invoices at `/helper-my-invoices`
- [ ] Helper only sees invoices where `helper_id` matches their user ID
- [ ] Helper cannot see other helpers' invoices
- [ ] Summary cards show helper's totals
- [ ] Status badges display correctly
- [ ] Period dates display in UK format
- [ ] Amounts display in UK format

### 5.2 Helper Invoice Filtering
- [ ] Helper can filter by status
- [ ] Filters work correctly
- [ ] Empty state shows when no invoices

### 5.3 Helper Invoice Detail View
- [ ] Helper can click invoice to view details
- [ ] Helper can see all line items
- [ ] Helper can see payment history
- [ ] Helper can export invoice to CSV
- [ ] Helper cannot issue invoice (no button shown)
- [ ] Helper cannot record payment (no button shown)

---

## 6. CSV EXPORTS

### 6.1 Invoice CSV Export
- [ ] Export button downloads CSV file
- [ ] CSV filename includes invoice number and date
- [ ] CSV includes invoice header information
- [ ] CSV includes all line items
- [ ] CSV includes payment history
- [ ] Dates formatted as dd/MM/yyyy
- [ ] Currency formatted as £
- [ ] CSV is accountant-ready format

### 6.2 Invoice Summary CSV Export
- [ ] Summary export includes all invoices
- [ ] Summary includes totals row
- [ ] Format is accountant-ready

### 6.3 Payment CSV Export
- [ ] Payment export includes all payments
- [ ] Payment export includes totals
- [ ] Format is accountant-ready

---

## 7. RLS & SECURITY

### 7.1 Owner Access
- [ ] Owner can view all invoices for their helpers
- [ ] Owner can create invoices for their helpers
- [ ] Owner can issue invoices
- [ ] Owner can record payments
- [ ] Owner cannot see invoices for other owners' helpers

### 7.2 Helper Access
- [ ] Helper can view only their own invoices
- [ ] Helper cannot see other helpers' invoices
- [ ] Helper cannot see owner financials
- [ ] Helper cannot create invoices
- [ ] Helper cannot issue invoices
- [ ] Helper cannot record payments
- [ ] Helper cannot modify invoices

### 7.3 Data Isolation
- [ ] RLS policies prevent cross-owner data access
- [ ] RLS policies prevent helper-to-helper data access
- [ ] RLS policies prevent helper from seeing owner data
- [ ] All queries respect RLS policies

---

## 8. AUDIT LOGS

### 8.1 Invoice Creation Logging
- [ ] Invoice creation creates audit log entry
- [ ] Audit log includes: invoice_id, action, user_id, changes
- [ ] Changes include period details and totals

### 8.2 Invoice Issuing Logging
- [ ] Invoice issuing creates audit log entry
- [ ] Audit log includes issued_at timestamp

### 8.3 Payment Logging
- [ ] Payment creation creates audit log entry
- [ ] Audit log includes payment details
- [ ] Audit log links payment to invoice

### 8.4 Audit Log Access
- [ ] Owners can view audit logs for their invoices
- [ ] Helpers can view audit logs for their invoices
- [ ] Audit logs are immutable (cannot be edited/deleted)

---

## 9. UK FORMATTING

### 9.1 Date Formatting
- [ ] All dates display as dd/MM/yyyy (UK format)
- [ ] No US date formats (MM/dd/yyyy) appear
- [ ] Date pickers use UK format
- [ ] CSV exports use UK date format

### 9.2 Currency Formatting
- [ ] All currency displays as £ (not $)
- [ ] Currency uses formatCurrencyDecimal utility
- [ ] No hardcoded currency symbols
- [ ] CSV exports use £ symbol

---

## 10. INTEGRATION WITH EXISTING SYSTEM

### 10.1 Job Completion Integration
- [ ] Completed jobs with `helper_payment_amount` appear in invoice generation
- [ ] Jobs without `helper_payment_amount` are excluded
- [ ] Jobs already invoiced are excluded from new invoices
- [ ] Job completion workflow unchanged (no regressions)

### 10.2 Helper Assignment Integration
- [ ] Invoice generation respects helper assignments
- [ ] Only jobs assigned to helper are included
- [ ] Assignment cleanup on completion still works

### 10.3 Helper Earnings Integration
- [ ] Helper earnings page unchanged
- [ ] Invoice system doesn't affect earnings display
- [ ] Both systems can coexist

---

## 11. ERROR HANDLING

### 11.1 Invoice Generation Errors
- [ ] Error shown if no jobs available
- [ ] Error shown if duplicate invoice exists
- [ ] Error shown if invalid period dates
- [ ] Error messages are user-friendly
- [ ] Errors don't crash the app

### 11.2 Payment Recording Errors
- [ ] Error shown if invalid amount
- [ ] Error shown if invoice not found
- [ ] Error shown if unauthorized access
- [ ] Error messages are user-friendly

### 11.3 Network Errors
- [ ] Network errors show retry option
- [ ] Offline state handled gracefully
- [ ] Errors don't crash the app

---

## 12. PERFORMANCE

### 12.1 Invoice List Loading
- [ ] Invoice list loads quickly (< 2 seconds)
- [ ] Pagination works if many invoices
- [ ] Filters don't cause performance issues

### 12.2 Invoice Detail Loading
- [ ] Invoice detail loads quickly
- [ ] Line items load efficiently
- [ ] Payment history loads efficiently

### 12.3 CSV Export Performance
- [ ] CSV export completes quickly
- [ ] Large invoices export without issues
- [ ] Browser doesn't freeze during export

---

## 13. UI/UX

### 13.1 Invoice List UI
- [ ] Invoice cards are visually clear
- [ ] Status badges are color-coded
- [ ] Amounts are prominently displayed
- [ ] Hover states work correctly
- [ ] Click to view detail works

### 13.2 Invoice Detail Modal
- [ ] Modal is responsive
- [ ] Modal scrolls if content is long
- [ ] Close button works
- [ ] All information is readable

### 13.3 Payment Modal
- [ ] Payment form is clear
- [ ] Validation messages are helpful
- [ ] Submit button disabled during submission
- [ ] Success feedback is clear

### 13.4 Empty States
- [ ] Empty states show helpful messages
- [ ] Empty states include actionable guidance
- [ ] Empty states are visually appealing

### 13.5 Loading States
- [ ] Loading indicators show during async operations
- [ ] Buttons disabled during operations
- [ ] Loading messages are clear

---

## 14. EDGE CASES

### 14.1 Zero Amount Invoices
- [ ] Invoice with zero total handled correctly
- [ ] Status updates correctly
- [ ] Payment recording works

### 14.2 Overpayment
- [ ] Warning shown if payment exceeds outstanding balance
- [ ] Overpayment allowed (for corrections)
- [ ] Outstanding balance can go negative

### 14.3 Multiple Payments
- [ ] Multiple payments sum correctly
- [ ] Partial payments work correctly
- [ ] Payment history displays all payments

### 14.4 Cancelled Invoices
- [ ] Cancelled invoices display correctly
- [ ] Cancelled invoices excluded from summaries
- [ ] Payments cannot be recorded for cancelled invoices

---

## 15. XERO READINESS

### 15.1 CSV Structure
- [ ] CSV format matches Xero import requirements
- [ ] Invoice CSV can be imported to Xero Bills
- [ ] Payment CSV can be imported to Xero Bill Payments
- [ ] All required fields present

### 15.2 Data Mapping
- [ ] Invoice number maps to Xero Bill Number
- [ ] Invoice date maps to Xero Bill Date
- [ ] Amount maps to Xero Bill Amount
- [ ] Payment date maps to Xero Payment Date
- [ ] Payment method maps to Xero Payment Method

---

## CRITICAL ISSUES TO VERIFY

### Must Pass (Blockers):
- [ ] Invoice generation works correctly
- [ ] Invoice issuing locks invoices
- [ ] Payment recording updates totals correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Helpers only see their own invoices
- [ ] Owners can manage all invoices
- [ ] CSV exports are accountant-ready
- [ ] UK formatting is correct throughout

### Should Pass (High Priority):
- [ ] Invoice detail view shows all information
- [ ] Payment history displays correctly
- [ ] Filtering works correctly
- [ ] Empty states are helpful
- [ ] Error handling is robust

---

## SIGN-OFF

**Tester:** _________________  
**Date:** _________________  
**Status:** ☐ Pass ☐ Fail  
**Notes:** _________________

---

## TESTING SCENARIOS

### Scenario 1: Complete Invoice Flow
1. Owner generates weekly invoice for helper
2. Owner reviews invoice details
3. Owner issues invoice
4. Owner records full payment
5. Invoice status changes to paid
6. Helper views their invoice
7. Helper exports invoice to CSV

**Expected:** All steps work correctly, no errors

### Scenario 2: Partial Payment Flow
1. Owner generates monthly invoice
2. Owner issues invoice
3. Owner records partial payment
4. Invoice status remains issued
5. Owner records another partial payment
6. Invoice status changes to paid when fully paid

**Expected:** Partial payments work correctly, totals update

### Scenario 3: Multiple Invoices
1. Owner generates invoice for Helper A
2. Owner generates invoice for Helper B
3. Owner filters by Helper A
4. Only Helper A's invoices shown
5. Owner filters by status "issued"
6. Only issued invoices shown

**Expected:** Filtering works correctly

### Scenario 4: Security Test
1. Helper A views their invoices
2. Helper B tries to view Helper A's invoices
3. Helper B only sees their own invoices
4. Owner views all invoices
5. Owner can manage all invoices

**Expected:** RLS policies prevent unauthorized access

---

**End of QA Checklist**

