# SMS Template Usage Audit

**Date:** $(date)  
**Status:** ✅ All verified and correct

## Overview

This audit verifies that all SMS template triggers are correctly mapped to their appropriate template categories throughout the application.

---

## Template Category Mapping

| Trigger Type | Category | Status | Used In |
|-------------|----------|--------|---------|
| `tomorrow_sms_button` | `tomorrow_reminder` | ✅ | TomorrowSMSButton, Index.tsx |
| `text_customer_button` | `general` | ✅ | TextCustomerButton |
| `receipt_sms` | `receipt` | ✅ | CompletedJobItem, Index.tsx |
| `dd_invite_sms` | `direct_debit_invite` | ✅ | CustomerDetailModal |
| `dd_setup_modal_sms` | `direct_debit_invite` | ✅ | DirectDebitSetupModal |
| `dd_bulk_invite` | `direct_debit_invite` | ✅ | Customers.tsx |
| `unpaid_reminder` | `unpaid_reminder` | ✅ | UnpaidJobCard, Money.tsx |
| `customer_detail_reminder` | `general` | ✅ | CustomerDetailModal |
| `rain_check` | `rain_check` | ⚠️ | **NOT IMPLEMENTED** (template exists but no component uses it) |
| `on_my_way` | `on_my_way` | ✅ | OnMyWayButton |
| `review_request` | `review_request` | ✅ | AskForReviewButton |
| `price_increase` | `price_increase` | ✅ | PriceIncreaseWizard |

---

## Detailed Component Audit

### ✅ 1. Tomorrow Reminder SMS
**Trigger:** `tomorrow_sms_button`  
**Category:** `tomorrow_reminder`  
**Components:**
- `TomorrowSMSButton.tsx` (line 59) ✅
- `Index.tsx` (line 229) ✅

**Status:** ✅ Correct - Uses tomorrow reminder templates with scheduled date and job price

---

### ✅ 2. General Customer Messages
**Trigger:** `text_customer_button`  
**Category:** `general`  
**Components:**
- `TextCustomerButton.tsx` (line 51) ✅

**Status:** ✅ Correct - Uses general message templates for casual customer communication

---

### ✅ 3. Service Receipt SMS
**Trigger:** `receipt_sms`  
**Category:** `receipt`  
**Components:**
- `CompletedJobItem.tsx` (line 320) ✅ **FIXED**
- `Index.tsx` (line 352) ✅ **FIXED**

**Status:** ✅ Correct - Now uses receipt templates with job total and photo URL

**Previous Issue:** Was using `'receipt'` (category) instead of `'receipt_sms'` (trigger type) - **FIXED**

---

### ✅ 4. Direct Debit Invite SMS
**Trigger:** `dd_invite_sms`  
**Category:** `direct_debit_invite`  
**Components:**
- `CustomerDetailModal.tsx` (line 480) ✅

**Status:** ✅ Correct - Uses direct debit invite templates with authorization link

---

### ✅ 5. Direct Debit Setup Modal SMS
**Trigger:** `dd_setup_modal_sms`  
**Category:** `direct_debit_invite`  
**Components:**
- `DirectDebitSetupModal.tsx` (line 170) ✅

**Status:** ✅ Correct - Uses direct debit invite templates

---

### ✅ 6. Bulk Direct Debit Invite
**Trigger:** `dd_bulk_invite`  
**Category:** `direct_debit_invite`  
**Components:**
- `Customers.tsx` (line 138) ✅

**Status:** ✅ Correct - Uses direct debit invite templates for bulk sending

---

### ✅ 7. Unpaid Reminder SMS
**Trigger:** `unpaid_reminder`  
**Category:** `unpaid_reminder`  
**Components:**
- `UnpaidJobCard.tsx` (line 62) ✅
- `Money.tsx` (line 390) ✅

**Status:** ✅ Correct - Uses unpaid reminder templates with completed date and amount due

---

### ✅ 8. Customer Detail Reminder
**Trigger:** `customer_detail_reminder`  
**Category:** `general`  
**Components:**
- `CustomerDetailModal.tsx` (line 89) ✅

**Status:** ✅ Correct - Uses general message templates for customer reminders

---

### ⚠️ 9. Rain Check / Weather Reschedule
**Trigger:** `rain_check`  
**Category:** `rain_check`  
**Components:**
- **NONE** - Template exists but no component implements this feature

**Status:** ⚠️ **NOT IMPLEMENTED** - Template category exists in `smsTemplates.ts` but no component uses it. `RescheduleJobModal.tsx` does not send SMS messages.

**Recommendation:** Either implement rain check SMS functionality or remove the unused template category.

---

### ✅ 10. On My Way SMS
**Trigger:** `on_my_way`  
**Category:** `on_my_way`  
**Components:**
- `OnMyWayButton.tsx` (line 34) ✅

**Status:** ✅ Correct - Uses on my way templates

---

### ✅ 11. Review Request SMS
**Trigger:** `review_request`  
**Category:** `review_request`  
**Components:**
- `AskForReviewButton.tsx` (line 41) ✅

**Status:** ✅ Correct - Uses review request templates with Google review link

---

### ✅ 12. Price Increase SMS
**Trigger:** `price_increase`  
**Category:** `price_increase`  
**Components:**
- `PriceIncreaseWizard.tsx` (line 220) ✅

**Status:** ✅ Correct - Uses price increase templates with new and current price

---

## Summary

### ✅ All Active Templates: CORRECT
All 11 actively used SMS template triggers are correctly mapped to their appropriate categories.

### ⚠️ Unused Template: `rain_check`
The `rain_check` template category exists but is not used anywhere in the application. Consider:
1. Implementing rain check SMS functionality in `RescheduleJobModal.tsx`
2. Or removing the unused template category

### 🔧 Fixed Issues
1. ✅ **Service Receipt SMS** - Fixed in `CompletedJobItem.tsx` and `Index.tsx` to use `'receipt_sms'` trigger instead of `'receipt'` category

---

## Verification Checklist

- [x] All trigger types are valid `SMSTriggerType` values
- [x] All trigger types map to correct categories via `SMS_TRIGGER_TO_CATEGORY_MAP`
- [x] All components use correct trigger types (not categories directly)
- [x] Service receipt messages now use receipt templates (FIXED)
- [x] General messages use general templates
- [x] Direct debit invites use direct_debit_invite templates
- [x] All other templates correctly mapped

---

## Recommendations

1. **Implement or Remove `rain_check`**: The rain check template exists but is unused. Either add SMS functionality to `RescheduleJobModal.tsx` when rescheduling due to weather, or remove the unused template category.

2. **Consider Adding SMS to Reschedule**: The `RescheduleJobModal` component could optionally send an SMS notification when a job is rescheduled, using either the `rain_check` template (for weather-related) or a new `reschedule` template category.

---

## Test Scenarios

To verify all templates are working correctly:

1. **Tomorrow Reminder**: Click "Send Reminder" on upcoming jobs → Should show "Tomorrow Reminder" templates
2. **General Message**: Click "Send Text" button → Should show "General Message" templates
3. **Service Receipt**: Click "Send Service Receipt" on completed jobs → Should show "Service Receipt" templates ✅ (FIXED)
4. **Direct Debit Invite**: Click "Invite to Direct Debit" → Should show "Direct Debit Invite" templates
5. **Unpaid Reminder**: Click "Send Reminder" on unpaid jobs → Should show "Payment Reminder" templates
6. **On My Way**: Click "On My Way" button → Should show "On My Way" templates
7. **Review Request**: Click "Ask for Review" → Should show "Review Request" templates
8. **Price Increase**: Use Price Increase Wizard → Should show "Price Increase" templates

---

**Audit Complete** ✅

