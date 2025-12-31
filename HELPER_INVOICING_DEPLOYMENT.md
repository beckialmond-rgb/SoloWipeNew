# Helper Invoicing & Payment System - Deployment Guide
**Date:** 2025-02-11  
**Status:** Ready for Deployment

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Database Migrations

Run these migrations in order in your Supabase SQL Editor:

#### Migration 1: Schema Creation
```bash
# File: supabase/migrations/20250211000000_create_helper_invoicing_system.sql
# Run this migration first
```

**Verification:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log');

-- Should return 4 rows
```

#### Migration 2: Functions Creation
```bash
# File: supabase/migrations/20250211000001_create_helper_invoice_functions.sql
# Run this migration second
```

**Verification:**
```sql
-- Check functions exist
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'generate_helper_invoice',
  'issue_helper_invoice',
  'record_helper_payment',
  'get_helper_invoice_summary',
  'get_jobs_available_for_invoicing'
);

-- Should return 5 rows
```

#### Migration 3: Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log');

-- All should show rowsecurity = true
```

#### Migration 4: Verify Triggers
```sql
-- Check triggers exist
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname IN (
  'update_helper_invoices_updated_at',
  'update_helper_payments_updated_at',
  'update_invoice_on_payment_change'
);

-- Should return 3 rows
```

---

### Step 2: Frontend Deployment

#### Build Frontend
```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Check for build errors
# Should complete without errors
```

#### Deploy Frontend
Deploy to your hosting platform (Netlify/Vercel/etc.):

```bash
# Example for Vercel
vercel --prod

# Example for Netlify
netlify deploy --prod
```

**Verification:**
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Routes are accessible

---

### Step 3: Post-Deployment Verification

#### 3.1 Test Database Functions

```sql
-- Test: Get invoice summary (should return empty summary for new system)
SELECT * FROM get_helper_invoice_summary(
  p_owner_id := 'YOUR_OWNER_ID'::UUID,
  p_helper_id := NULL,
  p_period_start := NULL,
  p_period_end := NULL
);

-- Should return summary with all zeros for new system
```

#### 3.2 Test RLS Policies

**As Owner:**
```sql
-- Should be able to query invoices
SELECT * FROM helper_invoices WHERE owner_id = auth.uid();
```

**As Helper:**
```sql
-- Should only see own invoices
SELECT * FROM helper_invoices WHERE helper_id = auth.uid();
```

#### 3.3 Test Frontend Routes

- [ ] Navigate to `/helper-invoices` (owner only)
- [ ] Navigate to `/helper-my-invoices` (helper only)
- [ ] Verify pages load without errors
- [ ] Verify empty states display correctly

---

## 🧪 TESTING CHECKLIST

### Test 1: Generate Invoice
1. [ ] Login as owner
2. [ ] Navigate to `/helper-invoices`
3. [ ] Click "New Invoice"
4. [ ] Select helper
5. [ ] Select period type (weekly/monthly)
6. [ ] Select period (previous week/month)
7. [ ] Click "Generate Invoice"
8. [ ] Verify invoice appears in list
9. [ ] Verify invoice status is "draft"
10. [ ] Verify line items are correct

### Test 2: Issue Invoice
1. [ ] Click on draft invoice
2. [ ] Verify invoice details display
3. [ ] Click "Issue Invoice"
4. [ ] Verify status changes to "issued"
5. [ ] Verify invoice is locked (cannot edit)

### Test 3: Record Payment
1. [ ] Click on issued invoice
2. [ ] Click "Record Payment"
3. [ ] Enter payment details
4. [ ] Click "Record Payment"
5. [ ] Verify payment appears in history
6. [ ] Verify outstanding balance updates
7. [ ] Verify status changes to "paid" when fully paid

### Test 4: Helper View
1. [ ] Login as helper
2. [ ] Navigate to `/helper-my-invoices`
3. [ ] Verify only own invoices visible
4. [ ] Verify cannot see other helpers' invoices
5. [ ] Click on invoice
6. [ ] Verify can view details
7. [ ] Verify cannot issue or record payments
8. [ ] Verify can export CSV

### Test 5: CSV Export
1. [ ] Click "Export CSV" on invoice
2. [ ] Verify CSV downloads
3. [ ] Verify CSV format is correct
4. [ ] Verify dates are dd/MM/yyyy
5. [ ] Verify currency is £

### Test 6: Filtering
1. [ ] Filter by helper
2. [ ] Filter by status
3. [ ] Verify filters work together
4. [ ] Verify empty states show correctly

---

## 🔍 TROUBLESHOOTING

### Issue: Migration Fails

**Error:** "relation already exists"
- **Solution:** Tables may already exist. Use `DROP TABLE IF EXISTS` or check existing tables.

**Error:** "function already exists"
- **Solution:** Functions may already exist. The `CREATE OR REPLACE FUNCTION` should handle this.

**Error:** "permission denied"
- **Solution:** Ensure you're running migrations as database owner/admin.

### Issue: RLS Policies Not Working

**Symptom:** Users can't see invoices
- **Solution:** Verify RLS is enabled: `ALTER TABLE helper_invoices ENABLE ROW LEVEL SECURITY;`
- **Solution:** Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'helper_invoices';`

### Issue: Functions Not Found

**Symptom:** "function does not exist"
- **Solution:** Verify functions were created: `SELECT proname FROM pg_proc WHERE proname LIKE '%helper%invoice%';`
- **Solution:** Re-run function migration

### Issue: Frontend Errors

**Symptom:** "Cannot read property of undefined"
- **Solution:** Check that hooks are properly initialized
- **Solution:** Verify user authentication is working
- **Solution:** Check browser console for errors

**Symptom:** Routes not found
- **Solution:** Verify routes are added to `App.tsx`
- **Solution:** Clear browser cache
- **Solution:** Rebuild frontend

---

## 📊 MONITORING

### First 24 Hours

Monitor these metrics:
- [ ] Error logs for invoice generation
- [ ] Error logs for payment recording
- [ ] RLS policy violations
- [ ] Function execution times
- [ ] Database query performance

### First Week

Monitor these metrics:
- [ ] Invoice generation success rate
- [ ] Payment recording success rate
- [ ] CSV export usage
- [ ] User adoption rate
- [ ] Performance issues

---

## 🔄 ROLLBACK PLAN

If critical issues are found:

### Rollback Database
```sql
-- Drop functions
DROP FUNCTION IF EXISTS generate_helper_invoice CASCADE;
DROP FUNCTION IF EXISTS issue_helper_invoice CASCADE;
DROP FUNCTION IF EXISTS record_helper_payment CASCADE;
DROP FUNCTION IF EXISTS get_helper_invoice_summary CASCADE;
DROP FUNCTION IF EXISTS get_jobs_available_for_invoicing CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_helper_invoices_updated_at ON helper_invoices;
DROP TRIGGER IF EXISTS update_helper_payments_updated_at ON helper_payments;
DROP TRIGGER IF EXISTS update_invoice_on_payment_change ON helper_payments;

-- Drop tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS helper_invoice_audit_log CASCADE;
DROP TABLE IF EXISTS helper_payments CASCADE;
DROP TABLE IF EXISTS helper_invoice_items CASCADE;
DROP TABLE IF EXISTS helper_invoices CASCADE;
```

### Rollback Frontend
- Revert routes in `App.tsx`
- Remove invoice pages/components
- Redeploy previous version

---

## ✅ SUCCESS CRITERIA

**Deployment Successful If:**
- ✅ All migrations run successfully
- ✅ All tables created
- ✅ All functions created
- ✅ All RLS policies active
- ✅ Frontend builds successfully
- ✅ Routes are accessible
- ✅ Invoice generation works
- ✅ Payment recording works
- ✅ CSV exports work
- ✅ No errors in logs

---

## 📞 SUPPORT

If issues arise:
1. Check error logs (Supabase Dashboard → Logs)
2. Check browser console for frontend errors
3. Review QA checklist: `HELPER_INVOICING_QA_CHECKLIST.md`
4. Review implementation docs: `HELPER_INVOICING_SYSTEM_COMPLETE.md`

---

**End of Deployment Guide**

