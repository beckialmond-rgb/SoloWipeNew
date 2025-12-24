# Direct Debit Flow - Complete Explanation

**Based on your codebase implementation**

---

## 📋 Overview

Your Direct Debit system uses GoCardless to automatically collect payments from customers. Here's how it works end-to-end:

---

## 🔄 Complete Flow: From Invite to Payment

### **Step 1: Send Direct Debit Invite** 📱

**What happens:**
1. You click "Invite to Direct Debit" on a customer
2. App calls `gocardless-create-mandate` edge function
3. Function creates a **billing request** in GoCardless
4. Function creates a **billing request flow** (the setup page)
5. Customer record is updated:
   - `gocardless_mandate_status = 'pending'`
   - `gocardless_id = 'br_[billingRequestId]'` (temporary, for webhook matching)
6. SMS is sent to customer with the setup link

**Customer sees:**
- SMS with link to set up Direct Debit
- Link opens GoCardless setup page
- Customer enters bank details and authorizes

**In your app:**
- Customer shows as **"Pending"** status
- App is waiting for GoCardless webhook

---

### **Step 2: Mandate Activation (Webhook)** ✅

**What happens:**
1. Customer completes setup on GoCardless
2. GoCardless sends webhook to your app: `mandates.active` or `mandates.created`
3. Webhook handler (`gocardless-webhook`) receives the event
4. Function matches customer by billing request ID
5. Customer record is updated:
   - `gocardless_id = '[mandateId]'` (real mandate ID, replaces billing request ID)
   - `gocardless_mandate_status = 'active'`

**In your app:**
- Customer status changes from **"Pending"** → **"Active"**
- Customer now shows "Direct Debit Ready" badge
- Ready for automatic payment collection

**Timing:**
- Usually happens within seconds of customer completing setup
- If webhook is delayed, status updates when webhook arrives

---

### **Step 3: Job Completion & Automatic Payment Collection** 💰

**What happens when you complete a job:**

1. **You mark job as complete:**
   - App checks if customer has active Direct Debit (`gocardless_mandate_status === 'active'`)
   - If yes, automatically collects payment

2. **Payment collection process:**
   - App calls `gocardless-collect-payment` edge function
   - Function:
     - Validates GoCardless token
     - Creates payment in GoCardless API
     - Calculates fees:
       - **Platform fee:** 0.75% + £0.30
       - **GoCardless fee:** 1% + £0.20 (max £4.00)
       - **Net amount:** Gross - Platform fee - GoCardless fee
     - Updates job record:
       - `payment_status = 'processing'` (not 'paid' yet!)
       - `payment_method = 'gocardless'`
       - `gocardless_payment_id = '[paymentId]'`
       - `gocardless_payment_status = 'pending_submission'`
       - `platform_fee`, `gocardless_fee`, `net_amount` stored
       - `payment_date = null` (will be set when funds arrive)

3. **Job completion continues:**
   - Job marked as `status = 'completed'`
   - Receipt SMS sent (includes payment method: "Paid via GoCardless")
   - Next job scheduled (if recurring)

**In your app:**
- Job shows as **"Processing"** (yellow badge)
- Message: "Payment processing via GoCardless. Funds typically arrive in 3-5 working days."
- Job appears in "Unpaid" section (because not paid yet)

---

### **Step 4: Payment Status Updates (Webhooks)** 📊

**GoCardless sends webhooks as payment progresses:**

1. **`payments.submitted`** (within minutes)
   - Payment submitted to bank
   - `gocardless_payment_status = 'submitted'`
   - Job still shows "Processing"

2. **`payments.confirmed`** (within 1-2 days)
   - Bank confirmed the payment
   - `gocardless_payment_status = 'confirmed'`
   - Job still shows "Processing"

3. **`payments.paid_out`** (3-5 working days) ✅
   - **Funds arrive in your account**
   - `gocardless_payment_status = 'paid_out'`
   - `payment_status = 'paid'` (finally!)
   - `payment_date = [current timestamp]`
   - Job moves from "Unpaid" to "Paid" section
   - Money page shows it in earnings

**If payment fails:**
- `payments.failed` webhook received
- `gocardless_payment_status = 'failed'`
- `payment_status = 'unpaid'`
- You need to collect manually or retry

---

## 📊 Status Tracking

### **Customer Mandate Status:**

| Status | Meaning | What You See |
|--------|---------|--------------|
| `null` | No mandate | No Direct Debit set up |
| `'pending'` | Setup in progress | "Direct Debit Pending" badge |
| `'active'` | ✅ Ready to collect | "Direct Debit Ready" badge |
| `'cancelled'` | Customer cancelled | "Direct Debit Cancelled" |
| `'expired'` | Mandate expired | "Direct Debit Expired" |
| `'failed'` | Setup failed | "Direct Debit Failed" |

### **Job Payment Status:**

| Status | Meaning | What You See |
|--------|---------|--------------|
| `'unpaid'` | Not paid yet | Red "Unpaid" badge |
| `'processing'` | Payment in progress | Yellow "Processing" badge + message |
| `'paid'` | ✅ Funds received | Green "Paid" badge |

### **GoCardless Payment Status (Detailed):**

| Status | Meaning | Timing |
|--------|---------|--------|
| `'pending_submission'` | Payment created | Immediately |
| `'submitted'` | Sent to bank | Within minutes |
| `'confirmed'` | Bank confirmed | 1-2 days |
| `'paid_out'` | ✅ Funds received | 3-5 working days |
| `'failed'` | Payment failed | Varies |
| `'cancelled'` | Payment cancelled | Varies |

---

## 💰 Fee Calculation

**When payment is collected:**

1. **Gross Amount:** What customer pays (e.g., £20.00)
2. **Platform Fee:** 0.75% + £0.30 = £0.45 (for £20)
3. **GoCardless Fee:** 1% + £0.20 = £0.40 (for £20)
4. **Net Amount:** £20.00 - £0.45 - £0.40 = **£19.15**

**Stored in database:**
- `amount_collected = 20.00` (gross)
- `platform_fee = 0.45`
- `gocardless_fee = 0.40`
- `net_amount = 19.15`

**What you receive:** £19.15 (net amount)

---

## 🔄 Real-World Example Flow

### **Day 1: Setup**
1. **10:00 AM** - You send DD invite to customer
2. **10:05 AM** - Customer receives SMS, clicks link
3. **10:07 AM** - Customer completes setup on GoCardless
4. **10:07 AM** - Webhook received: `mandates.active`
5. **10:07 AM** - Customer status: **"Pending"** → **"Active"** ✅

### **Day 5: Job Completion**
1. **2:00 PM** - You complete customer's window cleaning job
2. **2:00 PM** - App automatically collects payment (£20.00)
3. **2:01 PM** - Payment created in GoCardless
4. **2:01 PM** - Job status: **"Processing"** (yellow badge)
5. **2:05 PM** - Webhook: `payments.submitted`
6. **2:05 PM** - Status: `submitted` (still processing)

### **Day 6-7: Payment Progress**
1. **Day 6** - Webhook: `payments.confirmed`
2. **Day 6** - Status: `confirmed` (still processing)
3. **Day 7** - Bank processing payment

### **Day 8-10: Funds Arrive**
1. **Day 8** - Webhook: `payments.paid_out` ✅
2. **Day 8** - Job status: **"Processing"** → **"Paid"** ✅
3. **Day 8** - `payment_date` set to current timestamp
4. **Day 8** - £19.15 (net) appears in your earnings
5. **Day 8** - Job moves from "Unpaid" to "Paid" section

---

## 🎯 Key Points

### **Automatic Collection:**
- ✅ Payments are **automatically collected** when you complete a job
- ✅ No manual action needed (if customer has active mandate)
- ✅ Happens instantly when job is marked complete

### **Status Updates:**
- ✅ Status updates automatically via webhooks
- ✅ You don't need to refresh or check manually
- ✅ App shows real-time status as payment progresses

### **Payment Timing:**
- ⏱️ **Immediate:** Payment created and submitted
- ⏱️ **1-2 days:** Payment confirmed by bank
- ⏱️ **3-5 working days:** Funds arrive in your account

### **Fees:**
- 💰 Fees are **automatically calculated** and stored
- 💰 You see **gross, fees, and net** in the app
- 💰 Net amount is what you actually receive

### **Failure Handling:**
- ❌ If payment fails, status updates to "Unpaid"
- ❌ You can retry collection or collect manually
- ❌ Customer mandate remains active (can retry)

---

## 🔍 Where to See Status

### **Customer Level:**
- **Customers Page:** Shows "Pending" or "Active" badge
- **Customer Detail Modal:** Shows full mandate status

### **Job Level:**
- **Home Page:** Job cards show payment status
- **Earnings Page:** Shows processing/paid status
- **Unpaid Jobs:** Shows jobs with `processing` or `unpaid` status
- **Completed Jobs:** Shows payment status badges

### **Financial:**
- **Money Page:** Shows DD earnings summary
- **Earnings Page:** Shows fee breakdown for GoCardless payments

---

## ✅ Your Current Status

Based on your test:
- ✅ Customer has **"Pending"** status
- ✅ This means: Customer received invite, setup in progress
- ⏳ **Next step:** Customer completes setup → Status changes to **"Active"**
- ⏳ **Then:** When you complete a job → Payment automatically collected

---

## 🚨 Important Notes

1. **Webhook Dependency:**
   - Status updates rely on GoCardless webhooks
   - If webhook is delayed, status may not update immediately
   - Webhooks usually arrive within seconds

2. **Payment Processing:**
   - Payments are **not instant** - they take 3-5 working days
   - Status shows "Processing" until funds arrive
   - This is normal GoCardless behavior

3. **Mandate Expiry:**
   - Mandates don't expire automatically
   - Customer can cancel anytime
   - You'll see status change if cancelled

4. **Multiple Payments:**
   - Each job completion = one payment
   - Each payment tracked separately
   - All payments use the same mandate

---

**Questions?** Check the browser console for `[GC-MANDATE]`, `[GC-COLLECT]`, and `[WEBHOOK]` logs to see the flow in action!

