# GoCardless Sandbox Timing - Important Notes

## ⏱️ Sandbox vs Production Timing

### **Sandbox Mode (Testing):**
- **Mandate Activation:** Takes **1 business day** to become active
- **Payment Processing:** Simulated delays (3-5 working days)
- **Purpose:** Testing environment with realistic delays

### **Production Mode (Live):**
- **Mandate Activation:** Usually **instant** or within minutes
- **Payment Processing:** Real processing (3-5 working days)
- **Purpose:** Real customer payments

---

## 🔄 What This Means for Your Test

### **Current Status:**
- Customer has completed Direct Debit setup
- GoCardless shows: "Direct Debit will be available in one business day"
- Your app shows: **"Pending"** status

### **What Happens Next:**
1. **Tomorrow (1 business day later):**
   - GoCardless activates the mandate
   - GoCardless sends webhook: `mandates.active`
   - Your app receives webhook
   - Status updates: **"Pending"** → **"Active"** ✅

2. **Or Use "Check Status" Button:**
   - Click "Check Status" button in customer detail
   - Function queries GoCardless API
   - If mandate is now active, status updates immediately
   - No need to wait for webhook

---

## 📋 Sandbox Testing Timeline

### **Day 1: Setup**
- **Morning:** Send DD invite to customer
- **Morning:** Customer completes setup
- **Status:** "Pending" (mandate not active yet)
- **GoCardless:** "Available in 1 business day"

### **Day 2: Activation**
- **Morning:** GoCardless activates mandate
- **Status:** "Pending" → **"Active"** ✅
- **Ready:** Can now collect payments

### **Day 3+: Job Completion**
- Complete job → Payment automatically collected
- Payment shows as "Processing"
- Status updates via webhooks as payment progresses

---

## ✅ How to Test Faster

### **Option 1: Wait for Natural Activation**
- Wait 1 business day
- Status will update automatically via webhook
- Most realistic testing

### **Option 2: Use "Check Status" Button**
- Click "Check Status" in customer detail modal
- Queries GoCardless API directly
- Updates status if mandate is now active
- Useful for checking if mandate activated

### **Option 3: Use Production Account (Not Recommended for Testing)**
- Production mandates activate instantly
- But uses real money and real customers
- Only use when ready for live customers

---

## 🚨 Important Notes

1. **This is Normal:**
   - Sandbox delays are intentional
   - They simulate real-world timing
   - Production is much faster

2. **Webhook Will Fire:**
   - When mandate activates (after 1 business day)
   - Status will update automatically
   - No manual action needed

3. **"Check Status" Button:**
   - Useful for checking if mandate activated
   - Doesn't speed up the process
   - Just checks current status

4. **Production Timing:**
   - In production, mandates activate instantly
   - Customers can set up and use immediately
   - No 1-day delay

---

## 🔍 How to Verify

### **Check GoCardless Dashboard:**
1. Go to: https://manage-sandbox.gocardless.com/
2. Navigate to **Mandates**
3. Find your test customer's mandate
4. Check status - should show "Active" after 1 business day

### **Check Your App:**
1. Open customer detail modal
2. Look at Direct Debit status
3. Click "Check Status" to refresh
4. Status should update when mandate is active

---

## 📝 Summary

**Current Situation:**
- ✅ Customer completed setup
- ⏳ Mandate pending activation (1 business day in sandbox)
- ✅ App correctly shows "Pending" status
- ✅ "Check Status" button available to refresh

**What to Do:**
- **Option 1:** Wait 1 business day - status will update automatically
- **Option 2:** Click "Check Status" tomorrow to verify activation
- **Option 3:** Continue testing other features while waiting

**In Production:**
- Mandates activate instantly
- No waiting period
- Customers can use Direct Debit immediately after setup

---

**This is expected sandbox behavior - everything is working correctly!** 🎉

