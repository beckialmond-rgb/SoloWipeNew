# SoloWipe Subscription System - Master Plan

**Date:** January 2025  
**Role:** Senior SaaS Growth Engineer & Payments Architect  
**Goal:** Build a frictionless, industry-standard subscription system with usage-based trial

---

## 📊 Step 1: Value-First Audit

### Current State Analysis

#### Existing Logic for Job Completion
- **Location:** `src/hooks/useSupabaseData.tsx` → `completeJobMutation` (line 457)
- **Flow:**
  1. Job completion updates `jobs` table: `status='completed'`, `completed_at`, `amount_collected`
  2. Handles offline/online sync
  3. Creates next job if customer has `frequency_weeks > 0`
  4. Triggers GoCardless payment collection if applicable
- **Current Tracking:** Jobs are tracked in `jobs` table but no usage counter exists

#### Existing Logic for SMS Sends
- **Location:** Multiple components via `openSMSApp()` utility (`src/utils/openSMS.ts`)
- **Key Entry Points:**
  - Receipt SMS: `CompletedJobItem.tsx` (line 320) - `receipt_sms` trigger
  - Tomorrow reminders: `Index.tsx` (line 229) - `tomorrow_sms_button` trigger
  - General messages: Various components - `text_customer_button` trigger
- **Current Tracking:** **NO DATABASE TRACKING** - SMS opens native app, no server-side logging
- **Critical Gap:** We cannot accurately count SMS sends without tracking

#### Current Subscription Infrastructure
- **Database:** `profiles` table has subscription fields (but no usage tracking)
  - `stripe_customer_id`, `subscription_id`, `subscription_status`, `subscription_ends_at`
- **Edge Functions:** 
  - `check-subscription` (exists, functional)
  - `create-checkout` (exists, functional)
  - `customer-portal` (exists, functional)
  - **MISSING:** Stripe webhook handler
- **Frontend Hooks:**
  - `useSubscription` - Currently hardcoded to `subscribed: true` (TEMPORARY FIX)
  - `useSoftPaywall` - Implements 7-day time-based trial (needs replacement)

---

## 🎯 Step 2: Business Model Decision

### Analysis: 14-Day Trial vs "First 10 Jobs Free"

#### Option A: 14-Day Trial (Time-Based)
**Pros:**
- Simple to implement
- Clear expiration date
- Industry standard for SaaS

**Cons:**
- ❌ **Poor fit for seasonal workers** - Window cleaners may sign up in winter, trial expires before they start working
- ❌ **Low perceived value** - User may not complete a single job during trial
- ❌ **Pressure-driven** - Creates artificial urgency, can feel pushy
- ❌ **Disconnects value from usage** - Time doesn't correlate with job completion

#### Option B: "First 10 Jobs Free" (Usage-Based) ⭐ **RECOMMENDED**
**Pros:**
- ✅ **Perfect for seasonal workers** - Works regardless of signup date
- ✅ **High perceived value** - User experiences full value before paywall
- ✅ **Value-aligned** - Directly correlates usage with value proposition
- ✅ **Natural conversion point** - "You've automated 10 cleans!" is compelling
- ✅ **No artificial pressure** - Users convert when they're ready
- ✅ **Better retention** - Users who convert after 10 jobs are highly engaged
- ✅ **Clearer messaging** - "First 10 jobs free" is more tangible than "14 days"

**Cons:**
- More complex to implement (usage tracking required)
- Requires tracking both jobs AND SMS sends

**Decision: "First 10 Jobs Free"** - Superior model for service-based businesses with seasonal usage patterns.

---

## 🗄️ Step 3: Database Schema Design

### New Table: `usage_counters`

```sql
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Usage tracking (incremented on each action)
  jobs_completed_count INTEGER NOT NULL DEFAULT 0,
  sms_sent_count INTEGER NOT NULL DEFAULT 0,
  
  -- Trial configuration
  free_jobs_limit INTEGER NOT NULL DEFAULT 10,
  free_sms_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Tracking when limits were hit
  jobs_limit_hit_at TIMESTAMPTZ,
  sms_limit_hit_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_counters_profile_id ON public.usage_counters(profile_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_usage_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_counters_updated_at();
```

### RLS Policies

```sql
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage counters"
  ON public.usage_counters FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own usage counters"
  ON public.usage_counters FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own usage counters"
  ON public.usage_counters FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
```

### Enhanced `profiles` Table (Grace Period Support)

**New Fields:**
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_grace_period BOOLEAN DEFAULT FALSE;
```

**Status Calculation Logic:**
- `subscription_status = 'active'` → Full access
- `subscription_status = 'trialing'` → Full access
- `subscription_status = 'past_due'` → Grace period (soft lock)
- `subscription_status = 'inactive'` + `grace_period_ends_at > NOW()` → Grace period (soft lock)
- `subscription_status = 'inactive'` + `grace_period_ends_at < NOW()` → Hard lock (paywall)

---

## 🔄 Step 4: Usage Counter Implementation

### Logic Flow

#### Job Completion Counter
**Location:** `src/hooks/useSupabaseData.tsx` → `completeJobMutation`

**Implementation:**
1. After successful job completion (line 583), increment `jobs_completed_count`
2. Check if `jobs_completed_count >= free_jobs_limit`
3. If limit hit:
   - Set `jobs_limit_hit_at = NOW()`
   - **Do NOT block job completion** (value-first approach)
   - Show modal on next page render/action

**Database Function (Recommended):**
```sql
CREATE OR REPLACE FUNCTION increment_job_completion(p_profile_id UUID)
RETURNS TABLE(jobs_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_reached BOOLEAN;
BEGIN
  -- Get or create usage counter
  INSERT INTO public.usage_counters (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
  
  -- Increment counter
  UPDATE public.usage_counters
  SET 
    jobs_completed_count = jobs_completed_count + 1,
    jobs_limit_hit_at = CASE 
      WHEN jobs_completed_count + 1 >= free_jobs_limit 
        AND jobs_limit_hit_at IS NULL 
      THEN NOW() 
      ELSE jobs_limit_hit_at 
    END
  WHERE profile_id = p_profile_id
  RETURNING jobs_completed_count, free_jobs_limit INTO v_current_count, v_limit;
  
  v_reached := v_current_count >= v_limit;
  
  RETURN QUERY SELECT v_current_count, v_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### SMS Send Counter
**Location:** Create new utility function `src/utils/trackSMSSend.ts`

**Implementation:**
1. Before/after `openSMSApp()` call, increment `sms_sent_count`
2. Check if `sms_sent_count >= free_sms_limit`
3. If limit hit, set `sms_limit_hit_at = NOW()`

**Critical Note:** Since SMS opens native app, we track on **SMS app open**, not on actual send confirmation.

```sql
CREATE OR REPLACE FUNCTION increment_sms_send(p_profile_id UUID)
RETURNS TABLE(sms_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_reached BOOLEAN;
BEGIN
  INSERT INTO public.usage_counters (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
  
  UPDATE public.usage_counters
  SET 
    sms_sent_count = sms_sent_count + 1,
    sms_limit_hit_at = CASE 
      WHEN sms_sent_count + 1 >= free_sms_limit 
        AND sms_limit_hit_at IS NULL 
      THEN NOW() 
      ELSE sms_limit_hit_at 
    END
  WHERE profile_id = p_profile_id
  RETURNING sms_sent_count, free_sms_limit INTO v_current_count, v_limit;
  
  v_reached := v_current_count >= v_limit;
  
  RETURN QUERY SELECT v_current_count, v_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 Step 5: Modal & User Experience

### Upgrade Modal Design

**Trigger:** When user hits limit AND subscription is not active

**Message:**
```
"You've automated 10 cleans! 🎉

Upgrade to SoloWipe Pro to keep your business sparkling.

What you get:
• Unlimited jobs & customers
• SMS receipts (covers cost of SMS & GoCardless processing)
• Route optimization
• Business insights & reports
• Priority support

Start Free Trial → Then £15/month"
```

**Key Principles:**
- Celebrate the achievement ("You've automated 10 cleans!")
- Clear value proposition (SMS receipts cover costs)
- Low-friction CTA (free trial first)
- **Non-blocking:** User can still access customer list

### Soft Lock Implementation

**Access Levels:**
1. **Full Access:** `subscription_status IN ('active', 'trialing')` OR usage < limits
2. **Soft Lock (Grace Period):** `subscription_status = 'past_due'` OR `grace_period_ends_at > NOW()`
   - ✅ Can view customer list
   - ✅ Can view job history
   - ❌ Cannot complete new jobs
   - ❌ Cannot send SMS
   - ✅ Can upgrade/subscribe
3. **Hard Lock:** `subscription_status = 'inactive'` AND `grace_period_ends_at < NOW()`
   - Same as soft lock + persistent upgrade modal

---

## 🔌 Step 6: Stripe Webhook Integration

### New Edge Function: `stripe-webhook`

**Events to Handle:**

1. **`customer.subscription.updated`**
   - Update `subscription_status`, `subscription_ends_at`
   - If status = `past_due`: Set `grace_period_ends_at = NOW() + 7 days`

2. **`customer.subscription.deleted`**
   - Set `subscription_status = 'inactive'`
   - Set `grace_period_ends_at = NOW() + 7 days`

3. **`invoice.payment_failed`**
   - If subscription exists: Set `subscription_status = 'past_due'`
   - Set `grace_period_ends_at = NOW() + 7 days`

4. **`invoice.payment_succeeded`**
   - If subscription was `past_due`: Set `subscription_status = 'active'`
   - Clear `grace_period_ends_at`

5. **`checkout.session.completed`**
   - Trigger `check-subscription` to refresh status

**Webhook Security:**
- Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`
- Use `stripe.webhooks.constructEvent()` to verify

---

## 🔐 Step 7: Subscription Status Logic

### Updated `useSubscription` Hook

**Status Hierarchy:**
1. Check Stripe subscription status (active/trialing)
2. If inactive, check usage limits (has free jobs/SMS remaining)
3. If no free usage, check grace period
4. Return appropriate access level

**New Status Types:**
```typescript
type AccessLevel = 
  | 'active'           // Full access (paid or trialing)
  | 'free_trial'       // Within free 10 jobs/SMS limit
  | 'grace_period'     // Payment failed, 7-day grace
  | 'locked';          // No access, must subscribe
```

### Updated `useSoftPaywall` Hook

**Replace time-based trial with usage-based:**

```typescript
const requirePremium = useCallback((action?: string): boolean => {
  // Still loading - allow (optimistic)
  if (subscriptionLoading) return true;
  
  // Has active subscription
  if (subscribed || status === 'trialing') return true;
  
  // Check usage limits
  const { jobsRemaining, smsRemaining } = usageCounters;
  const hasFreeUsage = jobsRemaining > 0 || smsRemaining > 0;
  if (hasFreeUsage) return true;
  
  // Check grace period
  if (isInGracePeriod) {
    // Soft lock: allow viewing, block actions
    if (action === 'view') return true;
    openPaywall(action);
    return false;
  }
  
  // No access - show paywall
  openPaywall(action);
  return false;
}, [subscribed, status, usageCounters, isInGracePeriod]);
```

---

## 🚀 Step 8: Implementation Roadmap

### Phase 1: Database Setup (Day 1)
- [ ] Create `usage_counters` table migration
- [ ] Add grace period fields to `profiles`
- [ ] Create database functions (`increment_job_completion`, `increment_sms_send`)
- [ ] Set up RLS policies
- [ ] Create migration script for existing users (initialize counters)

### Phase 2: Usage Tracking (Day 1-2)
- [ ] Integrate job completion counter in `completeJobMutation`
- [ ] Create `trackSMSSend()` utility function
- [ ] Wrap all SMS triggers with tracking
- [ ] Add usage counter queries to `useSupabaseData`

### Phase 3: Subscription Logic (Day 2)
- [ ] Update `useSubscription` hook (remove hardcoded true)
- [ ] Create usage counter hook (`useUsageCounters`)
- [ ] Update `useSoftPaywall` with usage-based logic
- [ ] Add grace period detection

### Phase 4: Stripe Webhook (Day 2-3)
- [ ] Create `stripe-webhook` edge function
- [ ] Handle all subscription events
- [ ] Set up webhook endpoint in Stripe Dashboard
- [ ] Test webhook with Stripe CLI

### Phase 5: UI/UX (Day 3)
- [ ] Create "Upgrade" modal component
- [ ] Update `TrialGateModal` with new messaging
- [ ] Implement soft lock UI (disable buttons, show badges)
- [ ] Add usage counter display (optional: "8/10 jobs remaining")

### Phase 6: Testing & Polish (Day 4)
- [ ] Test complete flow: signup → 10 jobs → modal → upgrade
- [ ] Test grace period flow: payment fails → soft lock → recovery
- [ ] Test edge cases: offline completion, SMS without phone, etc.
- [ ] Performance testing: ensure counters don't slow down operations

---

## 📋 Step 9: Key Implementation Details

### Job Completion Integration Point

**File:** `src/hooks/useSupabaseData.tsx`
**Function:** `completeJobMutation.mutationFn`
**Insert after:** Line 583 (after job update succeeds)

```typescript
// Increment usage counter
const { data: usageData, error: usageError } = await supabase
  .rpc('increment_job_completion', { p_profile_id: user.id });

if (usageError) {
  console.error('Failed to increment job counter:', usageError);
  // Don't fail job completion - counter is non-critical
}

// Check if limit reached (for modal trigger)
if (usageData && usageData[0]?.limit_reached) {
  // Trigger modal on next render (set state flag)
  // Don't block job completion!
}
```

### SMS Tracking Integration

**New File:** `src/utils/trackSMSSend.ts`

```typescript
export async function trackSMSSend(userId: string): Promise<{
  smsCount: number;
  limitReached: boolean;
}> {
  const { data, error } = await supabase
    .rpc('increment_sms_send', { p_profile_id: userId });

  if (error) {
    console.error('Failed to track SMS send:', error);
    return { smsCount: 0, limitReached: false };
  }

  return {
    smsCount: data[0]?.sms_count || 0,
    limitReached: data[0]?.limit_reached || false,
  };
}
```

**Integration Points:**
1. `src/components/CompletedJobItem.tsx` - Receipt SMS (line 340)
2. `src/pages/Index.tsx` - Tomorrow reminders (line 229)
3. All other SMS trigger points via `openSMSApp` wrapper

### Subscription Status Query

**New Hook:** `src/hooks/useUsageCounters.ts`

```typescript
export function useUsageCounters() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['usageCounters', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      
      // If not found, create one
      if (!data) {
        const { data: newData, error: createError } = await supabase
          .from('usage_counters')
          .insert({ profile_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        return newData;
      }
      
      return data;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
}
```

---

## 🎯 Success Metrics

### Conversion Metrics
- **Trial-to-Paid Conversion:** % of users who complete 10 jobs and subscribe
- **Time to Conversion:** Days from signup to subscription
- **Grace Period Recovery:** % of past_due users who recover within 7 days

### Engagement Metrics
- **Jobs Completed in Trial:** Average jobs completed before conversion
- **SMS Sent in Trial:** Average SMS sent before conversion
- **Feature Adoption:** % of trial users who use SMS receipts

### Revenue Metrics
- **MRR Growth:** Monthly recurring revenue from new subscriptions
- **Churn Rate:** % of subscribers who cancel (target <5% monthly)
- **LTV:** Lifetime value of converted users

---

## 🔒 Security Considerations

1. **RLS Enforcement:** All usage counter queries must respect RLS
2. **Rate Limiting:** Prevent abuse of usage counter increments
3. **Webhook Verification:** Always verify Stripe webhook signatures
4. **Grace Period Calculation:** Server-side only, never trust client
5. **Usage Counter Integrity:** Use database functions to prevent race conditions

---

## 📝 Migration Strategy for Existing Users

**One-Time Migration Script:**

```sql
-- Initialize usage counters for all existing users
INSERT INTO public.usage_counters (profile_id, jobs_completed_count, sms_sent_count)
SELECT 
  p.id,
  COALESCE((SELECT COUNT(*) FROM jobs j 
            JOIN customers c ON c.id = j.customer_id 
            WHERE c.profile_id = p.id AND j.status = 'completed'), 0),
  0 -- SMS count unknown (no historical tracking)
FROM profiles p
ON CONFLICT (profile_id) DO NOTHING;
```

**Note:** SMS counts start at 0 for existing users (we don't have historical data).

---

## ✅ Final Checklist

Before going live:

- [ ] Database migrations deployed
- [ ] Usage tracking integrated in all job completion paths
- [ ] SMS tracking integrated in all SMS triggers
- [ ] Stripe webhook configured and tested
- [ ] Subscription status logic tested (active, trialing, past_due, inactive)
- [ ] Grace period logic tested (7-day soft lock)
- [ ] Upgrade modal tested and messaging approved
- [ ] Soft lock UI tested (buttons disabled, customer list accessible)
- [ ] Existing user migration completed
- [ ] Performance tested (counters don't slow operations)
- [ ] Error handling tested (counter failures don't break core features)
- [ ] Analytics tracking added (conversion events)

---

## 🎓 Key Takeaways

1. **"First 10 Jobs Free" > 14-Day Trial** for seasonal service businesses
2. **Value-First Approach:** Never block job completion mid-action
3. **Soft Lock > Hard Lock:** Preserve user data access during grace period
4. **Grace Period Essential:** 7-day buffer prevents accidental churn from payment issues
5. **Clear Messaging:** "Covers SMS & GoCardless costs" removes pricing friction

---

**Next Steps:** Review this plan, then proceed with Phase 1 implementation.

