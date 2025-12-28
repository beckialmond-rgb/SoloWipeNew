# SoloWipe Multi-User Support: Manual Assignment Rollout Plan

**Date:** January 2025  
**Status:** Planning Phase - Awaiting Approval  
**Goal:** Enable Owners to manually assign jobs to Helpers with smart route-optimized display

---

## Executive Summary

This plan enables **manual multi-user support** for SoloWipe. Owners can assign jobs to Helpers through a simple, invisible UI. Helpers see only their assigned jobs, sorted by optimal route. The system maintains the "Apple-Simple" UX while adding powerful collaboration features.

**Key Principle:** Assignment is manual (Owner taps → selects Helper), but display is smart (Helper sees jobs sorted by efficiency).

---

## Phase 1: Codebase Audit Results

### A. Current Database Structure

#### Tables
1. **`profiles`** (One per user)
   - `id` (UUID, PK, references `auth.users`)
   - `business_name` (TEXT)
   - Subscription fields (Stripe, GoCardless)
   - **No role field** - users are implicitly owners

2. **`customers`** (Owned by profiles)
   - `id` (UUID, PK)
   - `profile_id` (UUID, FK → profiles.id)
   - `name`, `address`, `mobile_phone`, `price`
   - `latitude`, `longitude` (for route optimization)
   - `is_archived`, `is_scrubbed` (filtering flags)

3. **`jobs`** (Owned by customers)
   - `id` (UUID, PK)
   - `customer_id` (UUID, FK → customers.id)
   - `scheduled_date`, `status` ('pending' | 'completed')
   - `order_index` (INTEGER, nullable, for route optimization)
   - Payment tracking fields

#### Current RLS Policies
- **Profiles:** Users can only SELECT/UPDATE their own profile (`auth.uid() = id`)
- **Customers:** Users can only see customers where `profile_id = auth.uid()`
- **Jobs:** Users can only see jobs where `customer.profile_id = auth.uid()`

**Critical Finding:** All RLS is based on `profile_id` ownership. No multi-user access exists.

### B. Current UI Components

#### Job Display
- **`JobCard.tsx`** (309 lines)
  - Displays job with customer info, price, address
  - Supports swipe-to-complete (left swipe) and swipe-to-skip (right swipe)
  - Has drag handle for reordering
  - Quick actions: Navigate, Call, Text Customer
  - **No assignment UI currently**

- **`UpcomingJobsSection.tsx`** (216 lines)
  - Displays list of jobs
  - Supports search/filter
  - Uses `JobCard` components

- **`Index.tsx`** (Main dashboard, 2083 lines)
  - Renders `UpcomingJobsSection` for pending jobs
  - Handles job completion, skipping, rescheduling
  - Route optimization button integration

#### Route Optimization
- **`OptimizeRouteButton.tsx`** (496 lines)
  - Uses `navigator.geolocation.getCurrentPosition()` to get user location
  - Implements nearest neighbor algorithm
  - Geocodes addresses using Nominatim (OpenStreetMap)
  - Saves coordinates to `customers.latitude`/`longitude`
  - Saves route order to `jobs.order_index`

**Key Insight:** Route optimization already exists and works well. We can reuse this logic for Helpers.

### C. Data Fetching

- **`useSupabaseData.tsx`** (2255 lines)
  - Uses React Query (`useQuery`) for data fetching
  - Fetches jobs with: `.select('*, customer:customers(*)')`
  - Filters by `status = 'pending'` and `scheduled_date <= today`
  - **No Realtime subscriptions** - uses polling/refetch
  - **No assignment filtering** - shows all jobs for user's profile

### D. Location & Sorting

- **Location Access:** ✅ Available via `navigator.geolocation.getCurrentPosition()`
- **Distance Calculation:** ✅ Haversine formula in `OptimizeRouteButton.tsx`
- **Sorting Logic:** ✅ Nearest neighbor algorithm exists
- **Coordinate Storage:** ✅ `customers.latitude`/`longitude` fields exist

---

## Phase 2: Gap Analysis & Design

### A. Data Model & Security (RLS)

#### New Table: `job_assignments`

```sql
CREATE TABLE public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one assignment per job (can be reassigned)
  UNIQUE(job_id)
);

-- Indexes for performance
CREATE INDEX idx_job_assignments_assigned_to ON public.job_assignments(assigned_to_user_id);
CREATE INDEX idx_job_assignments_job_id ON public.job_assignments(job_id);
CREATE INDEX idx_job_assignments_assigned_by ON public.job_assignments(assigned_by_user_id);
```

**Design Decisions:**
- **One assignment per job** (UNIQUE constraint on `job_id`)
- **Cascade delete** - if job is deleted, assignment is deleted
- **Track assigner** - `assigned_by_user_id` for audit trail
- **Timestamp tracking** - `assigned_at` for sorting/analytics

#### RLS Policies for `job_assignments`

```sql
-- Enable RLS
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- Helpers can view assignments made to them
CREATE POLICY "Helpers can view their assignments"
  ON public.job_assignments FOR SELECT
  USING (assigned_to_user_id = auth.uid());

-- Owners can view assignments for their jobs
CREATE POLICY "Owners can view assignments for their jobs"
  ON public.job_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can create assignments for their jobs
CREATE POLICY "Owners can assign their jobs"
  ON public.job_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can update assignments for their jobs (reassignment)
CREATE POLICY "Owners can reassign their jobs"
  ON public.job_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can delete assignments for their jobs
CREATE POLICY "Owners can unassign their jobs"
  ON public.job_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );
```

#### Modified RLS Policies for `jobs`

**Current Policy (Owner View):**
```sql
-- Users can view jobs for their customers
CREATE POLICY "Users can view jobs for their customers"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
        AND customers.profile_id = auth.uid()
    )
  );
```

**New Policy (Helper View):**
```sql
-- Helpers can view jobs assigned to them
CREATE POLICY "Helpers can view assigned jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );
```

**Implementation Strategy:**
- **Keep existing policy** - Owners still see all their jobs
- **Add new policy** - Helpers see only assigned jobs
- **Both policies active** - Supabase RLS uses OR logic (user matches either policy)

#### Implicit Role Detection

**No `roles` table needed.** We determine role dynamically:

```typescript
// Owner: User has customers (profile_id = auth.uid())
const isOwner = customers.length > 0;

// Helper: User has assignments (assigned_to_user_id = auth.uid())
const isHelper = assignments.length > 0;

// Can be both: Owner who also receives assignments
const isBoth = isOwner && isHelper;
```

**Query Pattern:**
```typescript
// Check if user is owner
const { data: ownerCustomers } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .limit(1);

const isOwner = ownerCustomers && ownerCustomers.length > 0;
```

### B. The "Invisible" UI Flow

#### Owner View: Assignment Trigger

**Location:** `JobCard.tsx` (add assignment UI)

**Design:**
1. **Avatar Circle** (top-right of job card, next to status indicators)
   - Shows assigned Helper's avatar/initials if assigned
   - Shows "+" icon if unassigned
   - Tap to open assignment picker

2. **Assignment Picker Modal** (new component)
   - List of Helpers (users who have received assignments before)
   - Search/type to find Helper by email/name
   - "Assign to me" option (Owner can self-assign)
   - "Unassign" option (if already assigned)

**Implementation:**
```tsx
// In JobCard.tsx
{job.assignment && (
  <Avatar className="w-8 h-8">
    <AvatarFallback>{job.assignment.assigned_to.initials}</AvatarFallback>
  </Avatar>
)}

{!job.assignment && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => openAssignmentPicker(job)}
    className="w-8 h-8 rounded-full"
  >
    <UserPlus className="w-4 h-4" />
  </Button>
)}
```

**Assignment Picker Component:**
```tsx
// New: src/components/JobAssignmentPicker.tsx
interface JobAssignmentPickerProps {
  job: JobWithCustomer;
  onAssign: (userId: string) => void;
  onUnassign: () => void;
  currentAssignment?: JobAssignment;
}
```

**Helper Discovery:**
- Query `job_assignments` table for unique `assigned_to_user_id` values
- Join with `profiles` to get Helper names/emails
- Cache Helper list in React Query

#### Helper View: Swipe to Complete

**Current State:** `JobCard.tsx` already supports swipe-to-complete.

**Modification Needed:**
- **No changes to swipe gesture** - works as-is
- **Filter jobs** - Only show assigned jobs in Helper view
- **Route optimization** - Sort assigned jobs by distance

**Helper Job Query:**
```typescript
// In useSupabaseData.tsx
const { data: assignedJobs } = useQuery({
  queryKey: ['assignedJobs', user?.id, today],
  queryFn: async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        assignment:job_assignments!inner(
          assigned_to_user_id,
          assigned_at
        )
      `)
      .eq('status', 'pending')
      .eq('assignment.assigned_to_user_id', user.id)
      .lte('scheduled_date', today)
      .is('cancelled_at', null);
    
    // Sort by route optimization (distance from user location)
    return sortByRoute(jobs, userLocation);
  }
});
```

#### Optimistic Updates

**Strategy:** Update UI immediately, sync with server in background.

```typescript
// In assignment handler
const handleAssign = async (jobId: string, userId: string) => {
  // 1. Optimistic update
  queryClient.setQueryData(['pendingJobs', user?.id], (old: JobWithCustomer[]) => {
    return old.map(job => 
      job.id === jobId 
        ? { ...job, assignment: { assigned_to_user_id: userId } }
        : job
    );
  });
  
  // 2. Server update
  try {
    await supabase
      .from('job_assignments')
      .upsert({
        job_id: jobId,
        assigned_to_user_id: userId,
        assigned_by_user_id: user.id
      });
    
    // 3. Refetch to sync
    await queryClient.invalidateQueries(['pendingJobs']);
  } catch (error) {
    // 4. Rollback on error
    queryClient.setQueryData(['pendingJobs', user?.id], oldData);
    toast.error('Failed to assign job');
  }
};
```

**React Query Integration:**
- Use `useMutation` for assignments
- Use `onMutate` for optimistic updates
- Use `onError` for rollback
- Use `onSettled` for refetch

### C. Route "Harmonization" (The Singing Code)

#### Helper Route Sorting

**Location:** `useSupabaseData.tsx` (modify assigned jobs query)

**Algorithm:**
1. Get Helper's current location (via `navigator.geolocation`)
2. Calculate distance to each assigned job (using existing `calculateDistance` function)
3. Sort by distance (ascending)
4. Fallback: If location denied, sort by `scheduled_date`

**Implementation:**
```typescript
// Reuse existing function from OptimizeRouteButton.tsx
import { calculateDistance } from '@/components/OptimizeRouteButton';

const sortAssignedJobsByRoute = async (
  jobs: JobWithCustomer[],
  userLocation: { lat: number; lon: number } | null
): Promise<JobWithCustomer[]> => {
  if (!userLocation) {
    // Fallback: sort by scheduled_date
    return jobs.sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
  }
  
  // Calculate distance for each job
  const jobsWithDistance = jobs.map(job => {
    if (!job.customer.latitude || !job.customer.longitude) {
      return { job, distance: Infinity }; // No coordinates = end of list
    }
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lon,
      job.customer.latitude,
      job.customer.longitude
    );
    
    return { job, distance };
  });
  
  // Sort by distance
  jobsWithDistance.sort((a, b) => a.distance - b.distance);
  
  return jobsWithDistance.map(({ job }) => job);
};
```

**Location Permission Handling:**
```typescript
// Request location once, cache in state
const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

useEffect(() => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });
    },
    (error) => {
      console.warn('Location denied, using date sorting:', error);
      // Continue without location - will use date sorting
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}, []);
```

**Performance:**
- Cache location in React Query (`useQuery` with long stale time)
- Only recalculate on job list changes
- Use `useMemo` for sorting calculation

#### Owner View: No Route Sorting

**Owner sees all jobs** (assigned + unassigned), sorted by `scheduled_date` (existing behavior).

**No changes needed** - Owners manage assignments, not routes.

---

## Phase 3: Implementation Plan

### Step 1: Database Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_job_assignments.sql`

```sql
-- Create job_assignments table
CREATE TABLE public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Indexes
CREATE INDEX idx_job_assignments_assigned_to ON public.job_assignments(assigned_to_user_id);
CREATE INDEX idx_job_assignments_job_id ON public.job_assignments(job_id);
CREATE INDEX idx_job_assignments_assigned_by ON public.job_assignments(assigned_by_user_id);

-- Enable RLS
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see Section A above)
-- [Paste all RLS policies from Section A]

-- Add Helper view policy to jobs table
CREATE POLICY "Helpers can view assigned jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );
```

### Step 2: TypeScript Types

**File:** `src/types/database.ts`

```typescript
export interface JobAssignment {
  id: string;
  job_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  created_at: string;
}

export interface JobWithCustomerAndAssignment extends JobWithCustomer {
  assignment?: JobAssignment & {
    assigned_to?: {
      id: string;
      email: string;
      // Add profile fields if needed
    };
  };
}
```

### Step 3: Assignment UI Components

**New Files:**
1. `src/components/JobAssignmentPicker.tsx` - Modal for selecting Helper
2. `src/components/JobAssignmentAvatar.tsx` - Avatar circle on JobCard
3. `src/components/HelperList.tsx` - List of available Helpers

**Modified Files:**
1. `src/components/JobCard.tsx` - Add assignment avatar/button
2. `src/hooks/useSupabaseData.tsx` - Add assignment queries/mutations

### Step 4: Data Fetching Logic

**Modified:** `src/hooks/useSupabaseData.tsx`

**New Queries:**
- `assignedJobs` - Jobs assigned to current user (Helper view)
- `helpers` - List of users who have received assignments
- `jobAssignments` - All assignments for Owner's jobs

**New Mutations:**
- `assignJob` - Create/update assignment
- `unassignJob` - Delete assignment

**Modified Queries:**
- `pendingJobs` - Include assignment data in SELECT
- Add conditional logic: Show assigned jobs if user is Helper, show all jobs if Owner

### Step 5: Route Sorting for Helpers

**New Hook:** `src/hooks/useRouteSorting.tsx`

```typescript
export function useRouteSorting(jobs: JobWithCustomer[]) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  
  // Get location on mount
  useEffect(() => {
    // [Location fetching logic]
  }, []);
  
  // Sort jobs by distance
  const sortedJobs = useMemo(() => {
    return sortAssignedJobsByRoute(jobs, userLocation);
  }, [jobs, userLocation]);
  
  return sortedJobs;
}
```

**Integration:** Use in `useSupabaseData.tsx` for Helper view.

### Step 6: Real-time Updates (Optional Enhancement)

**Current:** React Query polling/refetch

**Enhancement:** Supabase Realtime subscriptions

```typescript
// Subscribe to assignment changes
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('job-assignments')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'job_assignments',
        filter: `assigned_to_user_id=eq.${user.id}`
      },
      (payload) => {
        // Invalidate queries to refetch
        queryClient.invalidateQueries(['assignedJobs']);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

**Priority:** Low (can be added later). React Query refetch is sufficient for MVP.

---

## Phase 4: Design Constraints Compliance

### ✅ Law of One

**Requirement:** Do not create a separate "Helper App." Use the same components with conditional logic.

**Implementation:**
- Same `JobCard` component for Owner and Helper
- Same `Index.tsx` dashboard
- Conditional rendering based on `isOwner`/`isHelper` flags
- No separate routes or pages

**Example:**
```tsx
// In Index.tsx
const isOwner = customers.length > 0;
const isHelper = assignedJobs.length > 0;

// Show assignment UI only for Owners
{isOwner && <JobAssignmentAvatar job={job} />}

// Show route optimization only for Helpers
{isHelper && <OptimizeRouteButton jobs={assignedJobs} />}
```

### ✅ Law of Speed

**Requirement:** No page reloads. Use Supabase Realtime/Subscriptions if possible.

**Implementation:**
- Optimistic updates (UI updates instantly)
- React Query cache invalidation (background refetch)
- Optional: Supabase Realtime subscriptions (Phase 6)
- No form submissions or page navigation

### ✅ Law of Safety

**Requirement:** Ensure existing single-player users are unaffected.

**Implementation:**
- **Backward compatible:** Jobs without assignments work as before
- **Default behavior:** Owner sees all jobs (existing behavior)
- **No breaking changes:** RLS policies use OR logic (existing policies still work)
- **Migration safe:** `job_assignments` table is optional (jobs can exist without assignments)

**Testing Checklist:**
- [ ] Single-user Owner can complete jobs (no regression)
- [ ] Single-user Owner can create customers (no regression)
- [ ] Jobs without assignments display normally
- [ ] RLS policies don't block existing queries

---

## Phase 5: Testing Strategy

### Unit Tests

1. **Route Sorting Algorithm**
   - Test distance calculation (Haversine formula)
   - Test sorting with/without location
   - Test fallback to date sorting

2. **RLS Policies**
   - Test Owner can assign jobs
   - Test Helper can only see assigned jobs
   - Test Helper cannot see unassigned jobs
   - Test Owner can see all jobs (assigned + unassigned)

3. **Assignment Logic**
   - Test create assignment
   - Test update assignment (reassign)
   - Test delete assignment (unassign)
   - Test unique constraint (one assignment per job)

### Integration Tests

1. **Owner Flow**
   - Create job → Assign to Helper → Verify assignment appears
   - Reassign job → Verify old assignment removed
   - Unassign job → Verify job returns to unassigned state

2. **Helper Flow**
   - Login as Helper → See only assigned jobs
   - Complete assigned job → Verify completion works
   - Verify route sorting (jobs appear in distance order)

3. **Multi-User Flow**
   - Owner assigns job to Helper A
   - Helper A sees job in their list
   - Helper B does NOT see job
   - Owner can reassign to Helper B
   - Helper A no longer sees job, Helper B now sees it

### Manual Testing Checklist

- [ ] Owner can tap assignment button on JobCard
- [ ] Assignment picker shows list of Helpers
- [ ] Owner can assign job to Helper
- [ ] Assignment avatar appears on JobCard
- [ ] Helper sees only assigned jobs
- [ ] Helper jobs are sorted by route (distance)
- [ ] Helper can swipe to complete assigned job
- [ ] Owner can reassign job to different Helper
- [ ] Owner can unassign job
- [ ] Single-user mode still works (no assignments)

---

## Phase 6: Rollout Plan

### Phase 6.1: Database Migration (Day 1)

1. Create migration file
2. Test migration in staging
3. Deploy to production
4. Verify RLS policies work

### Phase 6.2: Backend Logic (Day 2-3)

1. Add TypeScript types
2. Create assignment queries/mutations
3. Add route sorting logic
4. Test data fetching

### Phase 6.3: UI Components (Day 4-5)

1. Create `JobAssignmentPicker` component
2. Add assignment avatar to `JobCard`
3. Create Helper list component
4. Test UI interactions

### Phase 6.4: Integration (Day 6-7)

1. Integrate assignment UI into `Index.tsx`
2. Add conditional rendering (Owner vs Helper)
3. Test end-to-end flows
4. Fix bugs

### Phase 6.5: Testing & Polish (Day 8-9)

1. Manual testing (full checklist)
2. Fix edge cases
3. Performance optimization
4. UI polish

### Phase 6.6: Deployment (Day 10)

1. Deploy to staging
2. User acceptance testing
3. Deploy to production
4. Monitor for issues

---

## Phase 7: Future Enhancements (Out of Scope)

### Not Included in MVP

1. **Automatic Assignment** - AI/algorithm-based assignment
2. **Helper Invitations** - Email invites to join as Helper
3. **Helper Profiles** - Dedicated Helper management page
4. **Assignment History** - Audit log of all assignments
5. **Bulk Assignment** - Assign multiple jobs at once
6. **Helper Performance** - Analytics for Helper completion rates
7. **Push Notifications** - Notify Helpers of new assignments

### Can Be Added Later

- Realtime subscriptions (Phase 6, optional)
- Helper avatars/photos
- Assignment comments/notes
- Assignment deadlines/priorities

---

## Phase 8: Risk Assessment

### High Risk

1. **RLS Policy Conflicts**
   - **Risk:** New Helper policy might conflict with Owner policy
   - **Mitigation:** Test thoroughly, use OR logic in policies

2. **Performance Degradation**
   - **Risk:** Route sorting adds computation overhead
   - **Mitigation:** Use `useMemo`, cache location, limit job count

### Medium Risk

1. **Location Permission Denied**
   - **Risk:** Helper can't get location, route sorting fails
   - **Mitigation:** Fallback to date sorting (already planned)

2. **Assignment Race Conditions**
   - **Risk:** Two Owners assign same job simultaneously
   - **Mitigation:** UNIQUE constraint on `job_id` prevents duplicates

### Low Risk

1. **UI Complexity**
   - **Risk:** Assignment UI clutters JobCard
   - **Mitigation:** Minimal design (small avatar, hidden until needed)

2. **Backward Compatibility**
   - **Risk:** Existing users affected
   - **Mitigation:** All changes are additive (no breaking changes)

---

## Phase 9: Success Metrics

### Technical Metrics

- [ ] Zero RLS policy violations
- [ ] Route sorting completes in < 100ms for 50 jobs
- [ ] Assignment creation succeeds in < 500ms
- [ ] No performance regression in single-user mode

### User Experience Metrics

- [ ] Owners can assign job in < 3 taps
- [ ] Helpers see jobs sorted by route (verified manually)
- [ ] Assignment UI is "invisible" (doesn't clutter interface)
- [ ] Single-user mode unchanged (no complaints)

### Business Metrics

- [ ] Multi-user feature adoption rate
- [ ] Average assignments per Owner
- [ ] Helper job completion rate
- [ ] User feedback (qualitative)

---

## Appendix A: SQL Migration Template

```sql
-- Migration: Add job assignments table
-- Date: YYYY-MM-DD
-- Description: Enables Owners to assign jobs to Helpers

BEGIN;

-- Create job_assignments table
CREATE TABLE IF NOT EXISTS public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_to 
  ON public.job_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id 
  ON public.job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_by 
  ON public.job_assignments(assigned_by_user_id);

-- Enable RLS
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- [Insert policies from Section A]

-- Add Helper view policy to jobs
CREATE POLICY "Helpers can view assigned jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );

COMMIT;
```

---

## Appendix B: Component Structure

```
src/
├── components/
│   ├── JobCard.tsx (MODIFIED - add assignment UI)
│   ├── JobAssignmentPicker.tsx (NEW - assignment modal)
│   ├── JobAssignmentAvatar.tsx (NEW - avatar component)
│   └── HelperList.tsx (NEW - helper selection list)
├── hooks/
│   ├── useSupabaseData.tsx (MODIFIED - add assignment queries)
│   ├── useRouteSorting.tsx (NEW - route sorting logic)
│   └── useJobAssignments.tsx (NEW - assignment mutations)
└── types/
    └── database.ts (MODIFIED - add JobAssignment type)
```

---

## Approval Checklist

Before proceeding with implementation, confirm:

- [ ] Database schema approved (job_assignments table structure)
- [ ] RLS policies approved (security model)
- [ ] UI design approved (avatar circle, assignment picker)
- [ ] Route sorting approach approved (distance-based)
- [ ] Backward compatibility confirmed (single-user mode)
- [ ] Testing strategy approved
- [ ] Rollout timeline acceptable

---

**END OF PLAN**

This document serves as the complete blueprint for implementing manual multi-user support in SoloWipe. All implementation details, security considerations, and UX flows are documented above.

**Next Step:** Await approval, then proceed with Phase 6.1 (Database Migration).





