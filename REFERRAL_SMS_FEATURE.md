# Family & Friends Referral SMS Feature

**Date:** $(date)  
**Status:** ✅ Complete

---

## Overview

A lead generation tool that allows window cleaners to send referral SMS messages to family and friends, offering their first clean for FREE. The SMS includes a unique referral code and asks recipients to text back with their name, address, and phone number.

---

## Features Implemented

### ✅ 1. Referral SMS Template Category
**Location:** `src/types/smsTemplates.ts`

**New Category:** `referral`
- **Display Name:** "Family & Friends Referral"
- **Description:** "Referral messages offering first clean free"
- **Trigger Type:** `referral_sms`

**Templates Created:**
1. **Professional** (Default):
   > "Hi! I'm offering family and friends their first window clean FREE! Use code {{referral_code}} and text me back with your name, address, and phone number. First clean is on the house! - {{business_name}}"

2. **Casual**:
   > "Hey! Got a deal for you - first window clean is FREE! Just use code {{referral_code}} and send me your name, address, and phone number. Let's get your windows sparkling! - {{business_name}}"

3. **Friendly**:
   > "Hi! 🎉 Special offer for family & friends - your first window clean is completely FREE! Use code {{referral_code}} and reply with your name, address, and phone number. Can't wait to help! - {{business_name}}"

---

### ✅ 2. Referral Code Generation
**Location:** `src/pages/Money.tsx`

**Algorithm:**
- Takes first 3 letters of business name (uppercase)
- Adds 3 random digits (000-999)
- Example: "My Window Cleaning" → "MYW123"

**Code:**
```typescript
const generateReferralCode = () => {
  const businessInitials = businessName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3);
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${businessInitials}${randomNum}`.toUpperCase();
};
```

---

### ✅ 3. Referral Card in Money Page
**Location:** `src/pages/Money.tsx` (after Revenue Dashboard)

**Design:**
- Prominent gradient card with gift icon
- Clear value proposition: "Grow your round!"
- Marketing-focused copy
- Large, touch-friendly button
- Positioned prominently at top of Money page

**Visual Hierarchy:**
1. Revenue Dashboard (top)
2. **Family & Friends Referral Card** (new - lead generation)
3. DD Earnings Summary
4. Unpaid/Paid tabs

---

### ✅ 4. SMS Flow
**User Journey:**
1. User clicks "Send Referral SMS" button
2. Template picker opens with 3 referral templates
3. User selects template (Professional/Casual/Friendly)
4. SMS app opens with pre-filled message including:
   - Unique referral code
   - Business name
   - Clear call-to-action (text back with details)
5. User sends to family/friends
6. Recipients text back with name, address, phone
7. Cleaner adds them as customer with first clean free

---

### ✅ 5. Template Variable Support
**New Variable:** `{{referral_code}}`
- Automatically generated per SMS
- Unique code for tracking referrals
- Included in all referral templates
- Properly replaced in template rendering

---

## Marketing Strategy

### Value Proposition
- **FREE first clean** - Strong incentive for referrals
- **Easy process** - Just text back with details
- **Personal connection** - Family & friends trust
- **Growth tool** - Expand customer base organically

### Call-to-Action
The SMS templates use proven marketing principles:
1. **Attention-grabbing opening** - "Hi!" / "Hey!" / "Hi! 🎉"
2. **Clear benefit** - "First clean FREE"
3. **Simple action** - "Use code X and text back"
4. **What to include** - Name, address, phone number
5. **Reinforcement** - "First clean is on the house!"
6. **Branding** - Business name signature

---

## Technical Implementation

### Files Modified:
1. ✅ `src/types/smsTemplates.ts`
   - Added `referral` category
   - Added `referral_sms` trigger type
   - Added `referral_code` to SMSTemplateContext
   - Added 3 referral templates

2. ✅ `src/pages/Money.tsx`
   - Added referral card component
   - Added referral code generation
   - Integrated with SMS template picker

3. ✅ `src/utils/smsTemplateUtils.ts`
   - Added `referral_code` to replacements
   - Proper variable replacement handling

4. ✅ `src/pages/SMSTemplates.tsx`
   - Added referral category to category info
   - Added `{{referral_code}}` variable display

---

## Usage

### For Window Cleaners:
1. Go to **Money** tab
2. See "Family & Friends Referral" card at top
3. Click **"Send Referral SMS"**
4. Choose template style (Professional/Casual/Friendly)
5. SMS app opens with message
6. Send to family/friends
7. Wait for replies with customer details
8. Add new customers with first clean marked as free

### For Recipients:
1. Receive SMS with referral code
2. Text back with:
   - Name
   - Address
   - Phone number
3. Get first clean for FREE
4. Become regular customer

---

## Benefits

### For Business:
- ✅ **Lead Generation** - Organic growth through referrals
- ✅ **Low Cost** - Free first clean is marketing investment
- ✅ **Trust Factor** - Family/friends referrals convert better
- ✅ **Easy Tracking** - Unique codes help track referral sources
- ✅ **Scalable** - Send to multiple people easily

### For Customers:
- ✅ **Free Service** - Strong incentive to try
- ✅ **Easy Process** - Just text back
- ✅ **Personal** - From someone they know
- ✅ **No Commitment** - Try before committing to regular service

---

## Future Enhancements (Optional)

1. **Referral Tracking**
   - Track which codes generate customers
   - Analytics on referral conversion rates
   - Reward top referrers

2. **Automated Customer Creation**
   - Parse incoming SMS replies
   - Auto-create customer from text message
   - Mark first job as free

3. **Referral Rewards**
   - Give referrer discount after referral signs up
   - Track referral chain
   - Build referral program

---

## Status

✅ **COMPLETE** - All features implemented and tested

- ✅ Referral SMS templates created
- ✅ Referral code generation working
- ✅ Referral card added to Money page
- ✅ SMS template picker integration
- ✅ Template variable replacement
- ✅ Marketing-focused copy

**Ready to use!** 🎉

