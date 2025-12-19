# Phase 7: Performance Optimization Guide

## Overview
This phase optimizes application performance, bundle size, database queries, and user experience.

---

## Current Performance Status

### ✅ Already Optimized

**Bundle Size:**
- JavaScript: **445.16 kB gzipped** ✅ (Target: < 2MB)
- CSS: **13.56 kB gzipped** ✅ (Target: < 100KB)
- HTML: **1.55 kB gzipped** ✅
- **Total: ~460 kB gzipped** ✅ (Excellent!)

**Code Splitting:**
- ✅ Routes lazy-loaded with `React.lazy()`
- ✅ Suspense boundaries configured
- ✅ Single bundle strategy (prevents chunk loading issues)

**Caching:**
- ✅ PWA service worker configured
- ✅ React Query caching enabled
- ✅ Supabase API caching configured
- ✅ Image caching configured

**Build Optimizations:**
- ✅ Tree-shaking enabled
- ✅ Minification enabled
- ✅ React deduplication
- ✅ Optimized dependencies

---

## Part 1: Bundle Size Optimization

### Current Analysis

**Bundle Breakdown:**
```
dist/assets/index.js: 1,554.60 kB (445.16 kB gzipped)
dist/assets/index-CYlPbSpH.css: 78.28 kB (13.56 kB gzipped)
```

**Status:** ✅ Already excellent - well under targets

### Analyze Bundle Composition

**Run Bundle Analysis:**
```bash
npm run analyze
# Opens dist/stats.html in browser
```

**What to Look For:**
- Large dependencies (> 100KB)
- Duplicate packages
- Unused code
- Heavy libraries

### Optimization Opportunities

#### 1. Remove Unused Dependencies
**Check for unused packages:**
```bash
npx depcheck
```

**Common candidates:**
- Unused UI libraries
- Unused utility functions
- Development-only packages in production

#### 2. Optimize Large Dependencies

**Check current large dependencies:**
- `@radix-ui/*` - UI components (needed)
- `framer-motion` - Animations (consider alternatives if large)
- `recharts` - Charts (only if used)
- `date-fns` - Date utilities (lightweight)

**If needed, consider:**
- Replace heavy libraries with lighter alternatives
- Use tree-shaking to remove unused exports
- Import only needed functions

#### 3. Code Splitting Strategy

**Current:** Single bundle (`inlineDynamicImports: true`)

**Consider:** Route-based code splitting (if bundle grows)

```typescript
// Already implemented in App.tsx
const Index = lazy(() => import("./pages/Index"));
const Customers = lazy(() => import("./pages/Customers"));
// etc.
```

**Recommendation:** ✅ Current approach is good for this app size

---

## Part 2: Image Optimization

### Current Images

**Check image sizes:**
```bash
ls -lh public/*.png public/*.jpg public/*.svg
```

**Images in app:**
- `app-icon.png` (192x192, 512x512)
- `logo.png`
- `favicon.ico`
- `icon-192x192.png`
- `icon-512x512.png`
- `placeholder.svg`

### Optimization Steps

#### 1. Compress Images
**Tools:**
- **Online:** TinyPNG, Squoosh
- **CLI:** imagemin, sharp
- **VS Code:** Image Optimizer extension

**Target sizes:**
- Icons: < 50KB
- Logos: < 100KB
- Photos: < 200KB (if used)

#### 2. Convert to WebP
**Modern format with better compression:**

```bash
# Using cwebp (WebP encoder)
cwebp input.png -q 80 -o output.webp
```

**Update code:**
```html
<picture>
  <source srcset="logo.webp" type="image/webp">
  <img src="logo.png" alt="Logo">
</picture>
```

#### 3. Use Responsive Images
**Serve appropriate sizes:**

```html
<img 
  srcset="icon-192.png 192w, icon-512.png 512w"
  sizes="(max-width: 600px) 192px, 512px"
  src="icon-512.png"
  alt="Icon"
/>
```

#### 4. Lazy Load Images
**Already configured in PWA:**
- Images cached by service worker
- Consider adding `loading="lazy"` attribute

---

## Part 3: Database Query Optimization

### Current Query Patterns

**Check for optimization opportunities:**

#### 1. Review Supabase Queries

**File:** `src/hooks/useSupabaseData.tsx`

**Optimization Checklist:**
- [ ] Use `.select()` to fetch only needed columns
- [ ] Use `.limit()` for large datasets
- [ ] Use `.order()` efficiently
- [ ] Avoid N+1 queries
- [ ] Use joins instead of multiple queries

#### 2. Add Database Indexes

**Verify indexes exist:**

```sql
-- Check existing indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Required indexes:**
- ✅ `profiles.subscription_status` (already exists)
- ✅ `profiles.gocardless_organisation_id` (already exists)
- ✅ `customers.gocardless_mandate_status` (already exists)
- ✅ `jobs.gocardless_payment_id` (already exists)
- ✅ `jobs.payment_status` (already exists)

**Additional indexes to consider:**
```sql
-- Index for filtering customers by status
CREATE INDEX IF NOT EXISTS idx_customers_status 
ON customers(status) WHERE status = 'active';

-- Index for filtering jobs by date
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date 
ON jobs(scheduled_date);

-- Index for filtering jobs by status
CREATE INDEX IF NOT EXISTS idx_jobs_status 
ON jobs(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_date 
ON jobs(customer_id, status, scheduled_date);
```

#### 3. Enable Query Caching

**React Query caching (already configured):**
```typescript
// In App.tsx
staleTime: STALE_TIME, // 5 minutes
gcTime: CACHE_TIME, // 24 hours
```

**Supabase query caching:**
- Use `.select()` with specific columns
- Use `.single()` for single row queries
- Use `.maybeSingle()` when row might not exist

#### 4. Optimize Common Queries

**Example optimizations:**

```typescript
// Before: Fetches all columns
const { data } = await supabase.from('customers').select('*');

// After: Fetch only needed columns
const { data } = await supabase
  .from('customers')
  .select('id, name, address, status')
  .eq('status', 'active');
```

---

## Part 4: React Performance Optimization

### Current Optimizations

**Already implemented:**
- ✅ Lazy loading for routes
- ✅ React Query for data fetching
- ✅ Suspense boundaries
- ✅ React deduplication

### Additional Optimizations

#### 1. Memoize Expensive Calculations

**Use `useMemo` for expensive computations:**

```typescript
// Example: Expensive filtering
const filteredCustomers = useMemo(() => {
  return customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [customers, searchQuery]);
```

#### 2. Memoize Callbacks

**Use `useCallback` for stable function references:**

```typescript
// Example: Stable callback
const handleCompleteJob = useCallback((jobId: string) => {
  completeJob(jobId);
}, [completeJob]);
```

#### 3. Optimize Re-renders

**Use `React.memo` for expensive components:**

```typescript
// Example: Memoize customer card
export const CustomerCard = React.memo(({ customer }) => {
  // Component code
});
```

#### 4. Virtualize Long Lists

**If displaying 100+ items, consider virtualization:**

```typescript
// Using react-window or react-virtual
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={customers.length}
  itemSize={100}
>
  {({ index, style }) => (
    <div style={style}>
      <CustomerCard customer={customers[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Part 5: API Call Optimization

### Minimize API Calls

#### 1. Batch Requests

**Combine multiple queries:**

```typescript
// Instead of multiple calls
const customers = await supabase.from('customers').select();
const jobs = await supabase.from('jobs').select();

// Use Promise.all for parallel requests
const [customers, jobs] = await Promise.all([
  supabase.from('customers').select(),
  supabase.from('jobs').select(),
]);
```

#### 2. Use React Query Effectively

**Already configured:**
- ✅ Query caching (5 min stale time)
- ✅ Cache persistence (24 hours)
- ✅ Automatic refetching

**Optimize further:**
- Use `refetchOnWindowFocus: false` for less critical queries
- Use `refetchInterval` for real-time data (if needed)
- Use `keepPreviousData: true` for pagination

#### 3. Debounce Search Queries

**Prevent excessive API calls:**

```typescript
import { useDebouncedValue } from '@mantine/hooks'; // or implement custom

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebouncedValue(searchQuery, 300);

// Use debouncedQuery in API call
useEffect(() => {
  // Fetch with debouncedQuery
}, [debouncedQuery]);
```

---

## Part 6: Network Optimization

### Enable CDN Caching

#### Netlify CDN
**Already configured:**
- ✅ Static assets cached automatically
- ✅ HTML cached with appropriate headers

**Optimize headers:**
```toml
# Add to netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### Supabase CDN
**Edge Functions:**
- Already served via CDN
- Consider adding cache headers

**Storage:**
- Images served via CDN
- Already optimized

### Enable Compression

**Netlify:**
- ✅ Automatic gzip/brotli compression
- ✅ Already enabled

**Verify:**
```bash
curl -H "Accept-Encoding: gzip" -I https://solowipe.co.uk
# Should see: Content-Encoding: gzip
```

---

## Part 7: Runtime Performance

### Optimize Initial Load

#### 1. Preload Critical Resources

**Add to `index.html`:**
```html
<link rel="preload" href="/assets/index.js" as="script">
<link rel="preload" href="/assets/index.css" as="style">
```

#### 2. Preconnect to External Domains

**Add to `index.html`:**
```html
<link rel="preconnect" href="https://owqjyaiptexqwafzmcwy.supabase.co">
<link rel="dns-prefetch" href="https://owqjyaiptexqwafzmcwy.supabase.co">
```

#### 3. Defer Non-Critical Scripts

**Already handled by Vite:**
- Scripts loaded as modules
- Deferred by default

### Optimize Rendering

#### 1. Use CSS Containment

**Add to component styles:**
```css
.component {
  contain: layout style paint;
}
```

#### 2. Use `will-change` Sparingly

**Only for animated elements:**
```css
.animated-element {
  will-change: transform;
}
```

#### 3. Optimize Animations

**Use CSS transforms instead of position:**
```css
/* Good */
.element {
  transform: translateX(100px);
}

/* Avoid */
.element {
  left: 100px;
}
```

---

## Part 8: Monitoring & Measurement

### Performance Metrics

#### Lighthouse Scores

**Target:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

**Run audit:**
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Review recommendations

#### Web Vitals

**Core Web Vitals:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Measure:**
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Performance Monitoring

#### Set Up Monitoring

**Options:**
- **Google Analytics** - Web Vitals
- **Sentry** - Performance monitoring
- **New Relic** - APM
- **Custom** - Performance API

**Example:**
```typescript
// Track performance metrics
performance.mark('app-start');
// ... app initialization
performance.mark('app-ready');
performance.measure('app-init', 'app-start', 'app-ready');
```

---

## Optimization Checklist

### Bundle Optimization
- [x] Bundle size < 2MB gzipped ✅ (445KB)
- [x] CSS size < 100KB gzipped ✅ (13.56KB)
- [ ] Analyze bundle composition
- [ ] Remove unused dependencies
- [ ] Optimize large dependencies

### Image Optimization
- [ ] Compress all images
- [ ] Convert to WebP format
- [ ] Use responsive images
- [ ] Lazy load images

### Database Optimization
- [x] Indexes created ✅
- [ ] Query optimization review
- [ ] Enable query caching
- [ ] Optimize common queries

### React Optimization
- [x] Lazy loading implemented ✅
- [ ] Memoize expensive calculations
- [ ] Memoize callbacks
- [ ] Optimize re-renders
- [ ] Virtualize long lists (if needed)

### API Optimization
- [x] React Query caching ✅
- [ ] Batch requests
- [ ] Debounce search queries
- [ ] Minimize API calls

### Network Optimization
- [x] CDN caching ✅
- [x] Compression enabled ✅
- [ ] Preload critical resources
- [ ] Preconnect to external domains

### Monitoring
- [ ] Lighthouse audit > 90
- [ ] Web Vitals measured
- [ ] Performance monitoring set up

---

## Quick Wins

### Immediate Optimizations (30 minutes)

1. **Run bundle analysis:**
   ```bash
   npm run analyze
   ```

2. **Compress images:**
   - Use TinyPNG or Squoosh
   - Target: < 50KB per image

3. **Add database indexes:**
   - Run index creation SQL
   - Verify indexes exist

4. **Run Lighthouse audit:**
   - Fix any critical issues
   - Aim for > 90 scores

### Medium-Term Optimizations (2-4 hours)

1. **Optimize React components:**
   - Add memoization where needed
   - Optimize re-renders

2. **Optimize database queries:**
   - Review query patterns
   - Add missing indexes
   - Optimize common queries

3. **Set up performance monitoring:**
   - Add Web Vitals tracking
   - Set up alerts

---

## Performance Targets

### Current Status vs Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle Size | < 2MB | 445KB | ✅ Excellent |
| CSS Size | < 100KB | 13.56KB | ✅ Excellent |
| Page Load | < 3s | ? | ⏳ Test needed |
| Lighthouse | > 90 | ? | ⏳ Test needed |
| LCP | < 2.5s | ? | ⏳ Test needed |
| FID | < 100ms | ? | ⏳ Test needed |

---

## Next Steps

1. ✅ Run bundle analysis
2. ✅ Compress images
3. ✅ Add database indexes
4. ✅ Run Lighthouse audit
5. ✅ Set up performance monitoring
6. ✅ Move to Phase 8: Staging Deployment

---

## Tools & Resources

### Analysis Tools
- **Bundle Analyzer:** `npm run analyze`
- **Lighthouse:** Chrome DevTools
- **WebPageTest:** https://www.webpagetest.org/
- **GTmetrix:** https://gtmetrix.com/

### Optimization Tools
- **Image Compression:** TinyPNG, Squoosh
- **Bundle Optimization:** Vite (already configured)
- **Database:** Supabase Dashboard → Database → Indexes

### Monitoring Tools
- **Google Analytics:** Web Vitals
- **Sentry:** Performance monitoring
- **Custom:** Performance API
