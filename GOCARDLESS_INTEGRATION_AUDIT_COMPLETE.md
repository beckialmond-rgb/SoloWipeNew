# GoCardless End-to-End Integration Audit - Implementation Complete

## Executive Summary

Complete audit and integration of GoCardless payment system with SoloWipe, ensuring professional fee handling, accurate financial reporting, and proper mandate/payment status tracking.

---

## ✅ 1. Service Fee Implementation (COMPLETE)

### Changes Made:
- **Fixed SoloWipe Service Fee**: Updated from 20p to **30p** (0.75% + 30p total)
- **Payment Collection Function** (`gocardless-collect-payment/index.ts`):
  - Service fee calculation: `(amountInPence × 0.0075) + 30` pence
  - Fee properly passed to GoCardless API via `app_fee` parameter
  - Automatic commission deduction to platform account

### Files Modified:
- `supabase/functions/gocardless-collect-payment/index.ts` - Service fee calculation
- `src/utils/exportCSV.ts` - Fee calculation in exports

---

## ✅ 2. Data Audit & Synchronization (COMPLETE)

### Mandate Status Tracking:
- ✅ Schema already captures `gocardless_mandate_status` in `customers` table
- ✅ Webhook handles all statuses: `pending`, `active`, `cancelled`, `expired`, `failed`
- ✅ Statuses properly synced from GoCardless webhooks

### Dashboard Visibility:
- ✅ **Customer Details Modal** updated to show clear mandate status:
  - **Active (Green)**: "Direct Debit Ready" - Payments collect automatically
  - **Pending (Yellow)**: "Direct Debit Pending" - Awaiting customer authorization
  - **Cancelled/Expired/Failed (Red)**: Shows specific status with option to set up new mandate

### Files Modified:
- `src/components/CustomerDetailModal.tsx` - Enhanced mandate status display

---

## ✅ 3. Fee Tracking in Database (COMPLETE)

### Schema Updates:
- Added `platform_fee` (NUMERIC) - SoloWipe platform fee (0.75% + £0.30)
- Added `gocardless_fee` (NUMERIC) - GoCardless processing fee (1% + £0.20, max £4)
- Added `net_amount` (NUMERIC) - Net payout after all fees
- Migration created: `20251221000000_add_fee_tracking_to_jobs.sql`

### Payment Collection:
- Fees automatically calculated and stored when payment is created
- Breakdown logged for debugging and audit trail

### Files Modified:
- `schema.sql` - Added fee columns
- `supabase/migrations/20251221000000_add_fee_tracking_to_jobs.sql` - New migration
- `supabase/functions/gocardless-collect-payment/index.ts` - Fee calculation & storage
- `src/types/database.ts` - Added fee fields to Job interface

---

## ✅ 4. Financial Reporting (IN PROGRESS)

### Gross vs. Net Calculation:
- **Gross Amount**: `amount_collected` (what customer pays)
- **Processing Fees**: `platform_fee + gocardless_fee`
- **Net Amount**: `net_amount` (what hits cleaner's bank account)

### Status Tracking:
- Payment status journey tracked via `gocardless_payment_status`:
  - `pending_submission` → `submitted` → `confirmed` → `paid_out`
  - Failed states: `failed`, `cancelled`, `charged_back`

### Files to Update (Remaining):
- `src/pages/Earnings.tsx` - Add fee breakdown display
- `src/pages/Money.tsx` - Add fee breakdown display
- `src/components/CompletedJobItem.tsx` - Show fee breakdown for GoCardless payments
- `src/components/EarningsCard.tsx` - Update to show net vs gross

---

## ✅ 5. Webhook Auditing & Enhancement (COMPLETE)

### Webhook Events Handled:
- ✅ `payments.paid_out` - Updates payment_date, marks as paid
- ✅ `payments.failed` - Marks payment as unpaid
- ✅ `payments.confirmed` - Updates payment status
- ✅ `payments.cancelled` - Marks payment as unpaid
- ✅ `payments.charged_back` - Marks payment as unpaid
- ✅ `mandates.created` - Sets status to active
- ✅ `mandates.active` - Confirms mandate active
- ✅ `mandates.cancelled` - Clears mandate
- ✅ `mandates.expired` - Clears mandate
- ✅ `mandates.failed` - Clears mandate

### Enhancements Made:
- Webhook now sets `payment_date` when `paid_out` event received
- Proper status mapping for all payment lifecycle events

### Files Modified:
- `supabase/functions/gocardless-webhook/index.ts` - Enhanced payment event handling

---

## 📋 6. Remaining Work Items

### UI Updates Needed:
1. **Earnings Page** (`src/pages/Earnings.tsx`):
   - Add fee breakdown section showing:
     - Total Gross Earnings
     - Total Platform Fees
     - Total GoCardless Fees
     - Total Net Earnings
   - Update CSV export to include fee columns

2. **Money Page** (`src/pages/Money.tsx`):
   - Show fee breakdown for each GoCardless payment
   - Add totals showing net vs gross

3. **CompletedJobItem Component** (`src/components/CompletedJobItem.tsx`):
   - For GoCardless payments, show expandable fee breakdown:
     - Gross: £XX.XX
     - Platform Fee: -£X.XX
     - GoCardless Fee: -£X.XX
     - **Net: £XX.XX** (highlighted)

4. **Payment Status Journey Display**:
   - Add badge/indicator showing payment status journey
   - Tooltip or expandable section showing: Pending Submission → Submitted → Confirmed → Paid Out

5. **Real-time Notifications**:
   - Add toast notification when webhook updates payment status
   - Consider polling or real-time subscriptions for payment status updates

---

## 🔧 Deployment Checklist

### Database Migration:
1. ✅ Run migration: `20251221000000_add_fee_tracking_to_jobs.sql`
2. ✅ Verify columns exist in `jobs` table
3. ✅ Verify indexes are created

### Edge Functions:
1. ✅ Deploy updated `gocardless-collect-payment` function
2. ✅ Deploy updated `gocardless-webhook` function
3. ✅ Verify webhook endpoint is listening for all required events

### Frontend:
1. ⏳ Update Earnings page with fee breakdown
2. ⏳ Update Money page with fee breakdown
3. ⏳ Update CompletedJobItem component
4. ⏳ Deploy updated frontend

### Testing:
1. ⏳ Create test payment and verify fees calculated correctly
2. ⏳ Verify fees stored in database
3. ⏳ Verify webhook updates payment_date on paid_out
4. ⏳ Verify UI displays fee breakdown correctly
5. ⏳ Test mandate status display in Customer Details

---

## 📊 Fee Calculation Reference

### SoloWipe Platform Fee:
```
Platform Fee = (Amount × 0.0075) + £0.30
Example: £100 payment = £0.75 + £0.30 = £1.05
```

### GoCardless Processing Fee:
```
GoCardless Fee = min((Amount × 0.01) + £0.20, £4.00)
Example: £100 payment = min(£1.00 + £0.20, £4.00) = £1.20
Example: £500 payment = min(£5.00 + £0.20, £4.00) = £4.00 (capped)
```

### Net Payout:
```
Net Amount = Gross Amount - Platform Fee - GoCardless Fee
Example: £100 payment = £100 - £1.05 - £1.20 = £97.75
```

---

## 🎯 Key Achievements

✅ Service fee correctly implemented (0.75% + 30p)
✅ Fee tracking columns added to database
✅ Fees automatically calculated and stored on payment creation
✅ Customer Details modal shows clear mandate status
✅ Webhook handles all payment lifecycle events
✅ Payment date set when payment paid out
✅ Database schema updated and migration created
✅ TypeScript types updated for fee fields

---

## 📝 Notes

- All fees are stored in pounds (not pence) for consistency
- Fees are rounded to 2 decimal places
- Only GoCardless payments have fees (cash/transfer payments have fees = 0)
- Migration includes backfill for existing GoCardless payments
- Webhook signature verification ensures security

---

**Status**: Core functionality complete. UI enhancements remain for full visibility of fee breakdown.

