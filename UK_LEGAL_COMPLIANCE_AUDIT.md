# UK Legal Compliance Audit - Master Plan
**Date:** January 2025  
**Role:** Senior Compliance Engineer & Full-Stack Developer  
**Status:** Non-Destructive Audit Complete

---

## 📋 EXECUTIVE SUMMARY

This audit confirms the current state of UK legal compliance pages and identifies gaps that must be addressed to meet 2025 UK standards. **No files have been modified** - this is a reconnaissance report only.

---

## 🔍 STEP 1: CODEBASE RECONNAISSANCE

### 1.1 Existing Legal Files Found

#### ✅ **CONFIRMED: Legal Pages Exist**

| File | Location | Status | Content |
|------|----------|--------|---------|
| `Legal.tsx` | `src/pages/Legal.tsx` | ✅ Active | Combined Terms & Privacy in tabbed interface |
| `Terms.tsx` | `src/pages/Terms.tsx` | ✅ Active | Standalone Terms of Service page |
| `Privacy.tsx` | `src/pages/Privacy.tsx` | ✅ Active | Standalone Privacy Policy page |
| `CookiePolicy.tsx` | ❌ **NOT FOUND** | ❌ Missing | No cookie policy page exists |

#### ✅ **CONFIRMED: Routing Configuration**

**File:** `src/App.tsx` (lines 106-108)

```typescript
<Route path="/terms" element={<Terms />} />
<Route path="/privacy" element={<Privacy />} />
<Route path="/legal" element={<Legal />} />
```

**Status:** ✅ All routes are properly configured and accessible.

#### ✅ **CONFIRMED: Navigation Links**

**Help & Support Section:**
- **File:** `src/components/HelpSection.tsx` (line 108-115)
- **Status:** ✅ Contains "Terms & Privacy" button that navigates to `/legal`
- **Note:** Previously linked to external URL, now fixed to internal navigation

**Settings Page:**
- **File:** `src/pages/Settings.tsx`
- **Status:** ✅ Terms & Privacy button removed (duplication eliminated)
- **Note:** Now only accessible via Help & Support (single source of truth)

---

## 🔍 STEP 2: UK LEGAL GAP ANALYSIS

### 2.1 Terms of Service Compliance

#### ❌ **MISSING: Governing Law Clause**

**Current State:**
- **File:** `src/pages/Legal.tsx` (Terms tab, lines 35-124)
- **File:** `src/pages/Terms.tsx` (lines 26-107)

**Gap Identified:**
- ❌ No "Governing Law" clause specifying England & Wales jurisdiction
- ❌ No mention of UK law application

**UK Requirement:**
- Must specify: "These Terms shall be governed by and construed in accordance with the laws of England and Wales."

#### ❌ **MISSING: UK Liability Carve-Out**

**Current State:**
- **File:** `src/pages/Legal.tsx` (line 97-103)
- **File:** `src/pages/Terms.tsx` (line 81-87)

**Current Text:**
```
"Limitation of Liability: SoloWipe shall not be liable for any indirect, 
incidental, special, consequential, or punitive damages..."
```

**Gap Identified:**
- ❌ Missing mandatory UK carve-out: "Nothing in these Terms shall exclude or limit our liability for death or personal injury caused by our negligence"
- **UK Law:** Unfair Contract Terms Act 1977 prohibits exclusion of liability for death/personal injury

**Required Addition:**
- Must include: "Nothing in these Terms shall exclude or limit our liability for death or personal injury caused by our negligence, fraud, or fraudulent misrepresentation, or any other liability that cannot be excluded or limited by English law."

#### ✅ **PRESENT: Other Required Elements**

- ✅ Acceptance of Terms
- ✅ Service Description
- ✅ User Responsibilities
- ✅ Data Ownership
- ✅ Acceptable Use Policy
- ✅ Service Availability Disclaimer
- ✅ Changes to Terms Clause
- ✅ Contact Information

---

### 2.2 Privacy Policy Compliance

#### ❌ **MISSING: Explicit Lawful Basis Section**

**Current State:**
- **File:** `src/pages/Legal.tsx` (Privacy tab, lines 128-242)
- **File:** `src/pages/Privacy.tsx` (lines 26-132)

**Gap Identified:**
- ❌ No explicit "Lawful Basis for Processing" section
- ❌ GDPR Article 6 requires explicit statement of legal basis (Contract, Legitimate Interest, Consent, etc.)

**UK Requirement:**
- Must state: "We process your personal data under the following lawful bases:"
  - Contract (to provide the service)
  - Legitimate Interest (business operations)
  - Legal Obligation (tax/accounting records)

#### ⚠️ **PARTIAL: Specific Data Types Listed**

**Current State:**
- **File:** `src/pages/Legal.tsx` (Privacy tab, line 140-145)
- **File:** `src/pages/Privacy.tsx` (line 31-36)

**Current Text:**
```
- Account information (email address, business name)
- Customer data you input (names, addresses, contact details)
- Job and payment records
- Photos uploaded as proof of work
```

**Gap Identified:**
- ⚠️ Mentions "contact details" but not explicitly "phone numbers"
- ⚠️ Mentions "job records" but not "job history" or "scheduled dates"
- ⚠️ Missing: GoCardless payment data, SMS message content, location data

**Required Enhancement:**
- Must explicitly list: "Customer phone numbers (mobile_phone field)", "Job history including scheduled dates and completion dates", "Payment method data (GoCardless mandates, payment status)"

#### ✅ **PRESENT: User Rights Section**

**Current State:**
- **File:** `src/pages/Legal.tsx` (Privacy tab, line 186-197)
- **File:** `src/pages/Privacy.tsx` (line 77-87)

**Status:** ✅ Contains:
- ✅ Access (right to receive copy)
- ✅ Erasure (right to deletion)
- ✅ Portability (right to export)
- ✅ Correction
- ✅ Withdraw consent

**Note:** Rights are listed but could be more explicit about GDPR Article 15-20 compliance.

#### ⚠️ **PARTIAL: Cookie Policy**

**Current State:**
- **File:** `src/pages/Legal.tsx` (Privacy tab, line 209-214)
- **File:** `src/pages/Privacy.tsx` (line 100-105)

**Current Text:**
```
"We use essential cookies to maintain your session and preferences. 
We do not use third-party tracking cookies for advertising purposes."
```

**Gap Identified:**
- ⚠️ Cookie information is embedded in Privacy Policy (not a separate policy)
- ⚠️ No detailed breakdown of:
  - Authentication session cookies (Supabase)
  - Cookie duration
  - How to manage/delete cookies
  - Third-party services (GoCardless, Stripe) cookie usage

**UK Requirement:**
- PECR (Privacy and Electronic Communications Regulations) requires detailed cookie policy
- Should be a separate page or detailed section

---

### 2.3 Cookie Policy Compliance

#### ❌ **MISSING: Dedicated Cookie Policy Page**

**Current State:**
- ❌ No `CookiePolicy.tsx` file exists
- ❌ No `/cookies` route exists
- ⚠️ Cookie information only mentioned briefly in Privacy Policy

**UK Requirement:**
- PECR requires detailed cookie policy explaining:
  - What cookies are used
  - Why they're used
  - How long they last
  - How to manage them
  - Third-party cookie usage (GoCardless, Stripe)

**Required Implementation:**
- Create `src/pages/CookiePolicy.tsx`
- Add route `/cookies` to `App.tsx`
- Detail authentication cookies (Supabase session)
- Detail third-party cookies (GoCardless OAuth, Stripe checkout)

---

## 🔍 STEP 3: FUNCTIONAL COMPLIANCE AUDIT

### 3.1 Consent Checkbox Verification

#### ✅ **CONFIRMED: Mandatory Non-Pre-Ticked Checkbox**

**File:** `src/pages/Auth.tsx`

**Location:** Lines 28, 374-397, 428

**Current Implementation:**
```typescript
const [acceptedTerms, setAcceptedTerms] = useState(false); // ✅ Starts as false (not pre-ticked)

// Checkbox (lines 377-396)
<Checkbox
  id="acceptTerms"
  checked={acceptedTerms}
  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
  className="h-5 w-5 mt-0.5"
/>
<label>
  I agree to the{' '}
  <a href="/terms" target="_blank">Terms of Service</a>{' '}
  and{' '}
  <a href="/privacy" target="_blank">Privacy Policy</a>
</label>

// Signup button disabled if not checked (line 428)
disabled={... || !acceptedTerms}
```

**Compliance Status:**
- ✅ **Non-pre-ticked:** `useState(false)` confirms checkbox starts unchecked
- ✅ **Mandatory:** Signup button is disabled until checked
- ✅ **Links present:** Links to Terms and Privacy pages
- ⚠️ **Minor Issue:** Links open in new tab (`target="_blank"`) - should open in same tab for better UX

**UK Compliance:** ✅ **COMPLIANT** - Meets GDPR consent requirements

---

### 3.2 Data Portability Verification

#### ✅ **CONFIRMED: Data Export Feature Exists**

**File:** `src/components/DataExportModal.tsx`

**Location:** Lines 23-100

**Current Implementation:**
```typescript
// Exports JSON format containing:
- exportDate, version
- user (id, email)
- profile (all profile data)
- customers (all customer records)
- jobs (all job history)
- statistics (totals, counts)
```

**Access Path:**
- Settings → Data Management → Export All Data

**Compliance Status:**
- ✅ **Feature exists:** Data export modal is implemented
- ✅ **GDPR compliant:** Exports all user data
- ⚠️ **Format:** Exports as JSON (not CSV)
- ✅ **Complete data:** Includes profile, customers, jobs, statistics

**UK Requirement (Data Act 2025):**
- ✅ **Requirement met:** Users can download their data
- ⚠️ **Format preference:** CSV format may be more user-friendly for accounting software
- ✅ **Accessibility:** Feature is accessible from Settings

**Recommendation:**
- Consider adding CSV export option alongside JSON
- Current JSON export is compliant but CSV would improve usability

---

## 📊 COMPLIANCE GAP SUMMARY

### 🔴 **CRITICAL GAPS (Must Fix)**

1. **Terms of Service:**
   - ❌ Missing "Governing Law" clause (England & Wales)
   - ❌ Missing UK liability carve-out (death/personal injury)

2. **Privacy Policy:**
   - ❌ Missing explicit "Lawful Basis for Processing" section
   - ⚠️ Data types not specific enough (phone numbers, job history details)

3. **Cookie Policy:**
   - ❌ No dedicated Cookie Policy page exists
   - ⚠️ Cookie information only briefly mentioned in Privacy Policy

### 🟡 **MINOR GAPS (Should Fix)**

1. **Consent Checkbox:**
   - ⚠️ Links open in new tab (should open in same tab)

2. **Data Export:**
   - ⚠️ Only JSON format (consider adding CSV option)

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Update Existing Pages (Non-Destructive)

#### 1.1 Update Terms of Service

**Files to Modify:**
- `src/pages/Legal.tsx` (Terms tab)
- `src/pages/Terms.tsx`

**Changes Required:**
1. Add "Governing Law" section (new section 10):
   ```
   10. Governing Law
   These Terms shall be governed by and construed in accordance with the laws 
   of England and Wales. Any disputes arising under or in connection with these 
   Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
   ```

2. Update "Limitation of Liability" section (section 7):
   ```
   7. Limitation of Liability
   Nothing in these Terms shall exclude or limit our liability for:
   - death or personal injury caused by our negligence;
   - fraud or fraudulent misrepresentation; or
   - any other liability that cannot be excluded or limited by English law.
   
   Subject to the above, SoloWipe shall not be liable for any indirect, 
   incidental, special, consequential, or punitive damages...
   ```

#### 1.2 Update Privacy Policy

**Files to Modify:**
- `src/pages/Legal.tsx` (Privacy tab)
- `src/pages/Privacy.tsx`

**Changes Required:**
1. Add "Lawful Basis for Processing" section (new section 2.5):
   ```
   2.5 Lawful Basis for Processing
   Under UK GDPR, we process your personal data under the following lawful bases:
   - Contract: To provide and maintain the SoloWipe service
   - Legitimate Interest: To improve our services and prevent fraud
   - Legal Obligation: To maintain accounting and tax records
   - Consent: For marketing communications (where applicable)
   ```

2. Enhance "Information We Collect" section (section 1):
   - Explicitly list: "Customer phone numbers (mobile_phone)"
   - Explicitly list: "Job history including scheduled dates, completion dates, and payment status"
   - Explicitly list: "GoCardless payment mandate data and payment status"
   - Explicitly list: "SMS message content (for receipts and reminders)"

#### 1.3 Create Cookie Policy Page

**New File to Create:**
- `src/pages/CookiePolicy.tsx`

**Content Required:**
1. What cookies are
2. Essential cookies (Supabase authentication session)
3. Third-party cookies (GoCardless OAuth, Stripe checkout)
4. Cookie duration
5. How to manage/delete cookies
6. Browser-specific instructions

**Routing:**
- Add route to `src/App.tsx`: `<Route path="/cookies" element={<CookiePolicy />} />`
- Add link in Help & Support section
- Add link in Privacy Policy (reference to cookie policy)

#### 1.4 Update Consent Checkbox Links

**File to Modify:**
- `src/pages/Auth.tsx` (line 388, 392)

**Change Required:**
- Remove `target="_blank"` from Terms and Privacy links
- Use `navigate('/terms')` and `navigate('/privacy')` instead of `<a href>`

---

### Phase 2: Enhance Data Export (Optional)

#### 2.1 Add CSV Export Option

**File to Modify:**
- `src/components/DataExportModal.tsx`

**Enhancement:**
- Add toggle: "Export Format: JSON / CSV"
- Implement CSV generation for customers and jobs
- Maintain JSON export for complete data backup

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Terms of Service includes "Governing Law: England & Wales"
- [ ] Terms of Service includes UK liability carve-out
- [ ] Privacy Policy includes "Lawful Basis for Processing" section
- [ ] Privacy Policy explicitly lists phone numbers, job history, payment data
- [ ] Cookie Policy page exists at `/cookies`
- [ ] Cookie Policy details authentication and third-party cookies
- [ ] Consent checkbox links open in same tab
- [ ] All legal pages accessible from Help & Support
- [ ] Data export feature works (JSON format confirmed)
- [ ] All pages match existing UI theme

---

## 📝 NOTES

1. **No Duplication:** Terms & Privacy appear only in Help & Support (duplication already removed)

2. **Data Export:** Current JSON export is GDPR compliant. CSV addition is optional enhancement.

3. **Cookie Policy:** Must be created as new page. Cannot be embedded in Privacy Policy alone.

4. **UK Law:** All updates must reference "England & Wales" specifically (not just "UK")

5. **Non-Destructive:** This audit has not modified any files. All changes are proposals.

---

## 🚀 NEXT STEPS

1. **Review this audit** with legal counsel
2. **Approve implementation plan** before code changes
3. **Implement Phase 1** (Critical gaps)
4. **Test all legal pages** for accessibility and compliance
5. **Update "Last updated" dates** to current date after changes

---

**Audit Complete. Awaiting approval to proceed with implementation.**

