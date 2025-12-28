# QuickBooks Integration Plan
**SoloWipe - Accounting Integration Implementation**

**Date:** January 2025  
**Status:** Planning Phase  
**Estimated Timeline:** 3-4 weeks

---

## Executive Summary

This document outlines the plan for integrating QuickBooks Online with SoloWipe to enable automatic synchronization of invoices, payments, and customer data. This integration will significantly reduce manual data entry for window cleaning professionals and improve their accounting workflow.

---

## 1. Objectives

### Primary Goals
1. **Automatic Invoice Sync**: Create invoices in QuickBooks when jobs are completed
2. **Payment Synchronization**: Sync payment status from SoloWipe to QuickBooks
3. **Customer Data Sync**: Keep customer information synchronized between platforms
4. **Financial Reporting**: Enable accurate financial reporting in QuickBooks

### Success Metrics
- 90%+ of users with QuickBooks connected sync invoices automatically
- <5% error rate on sync operations
- Average time saved: 2-3 hours per week per user

---

## 2. Technical Overview

### QuickBooks API
- **API Type**: RESTful API
- **Authentication**: OAuth 2.0 (similar to GoCardless)
- **API Version**: Latest (v3)
- **Documentation**: https://developer.intuit.com/app/developer/qbo/docs

### Integration Architecture
```
SoloWipe App
    ↓
Supabase Edge Function (quickbooks-sync)
    ↓
QuickBooks API
    ↓
QuickBooks Online Account
```

---

## 3. Implementation Phases

### Phase 1: OAuth Setup & Authentication (Week 1)

#### Tasks
1. **Register QuickBooks App**
   - Create developer account at https://developer.intuit.com
   - Register new app
   - Get Client ID and Client Secret
   - Configure redirect URI: `https://[supabase-url]/functions/v1/quickbooks-callback`

2. **OAuth Flow Implementation**
   - Create `quickbooks-connect` edge function
   - Implement OAuth authorization flow
   - Store encrypted access/refresh tokens in database
   - Handle token refresh automatically

3. **Database Schema Updates**
   ```sql
   ALTER TABLE profiles ADD COLUMN quickbooks_connected BOOLEAN DEFAULT FALSE;
   ALTER TABLE profiles ADD COLUMN quickbooks_access_token_encrypted TEXT;
   ALTER TABLE profiles ADD COLUMN quickbooks_refresh_token_encrypted TEXT;
   ALTER TABLE profiles ADD COLUMN quickbooks_realm_id TEXT;
   ALTER TABLE profiles ADD COLUMN quickbooks_connected_at TIMESTAMPTZ;
   ```

#### Deliverables
- OAuth connection working
- Tokens stored securely
- Connection status visible in Settings

---

### Phase 2: Customer Sync (Week 2)

#### Tasks
1. **Customer Mapping**
   - Map SoloWipe customers to QuickBooks Customers
   - Handle customer creation in QuickBooks
   - Sync customer updates (name, address, phone)

2. **Sync Logic**
   - On customer creation in SoloWipe → Create in QuickBooks
   - On customer update → Update in QuickBooks
   - Handle duplicates (match by email/phone)

3. **Edge Function: `quickbooks-sync-customer`**
   - Create/update customer in QuickBooks
   - Store QuickBooks customer ID in SoloWipe database
   - Handle errors gracefully

#### Deliverables
- Customers automatically sync to QuickBooks
- Customer updates propagate to QuickBooks
- Duplicate detection working

---

### Phase 3: Invoice Sync (Week 2-3)

#### Tasks
1. **Invoice Creation**
   - Create invoice in QuickBooks when job is completed
   - Map job data to QuickBooks invoice format
   - Include customer, amount, description, date

2. **Invoice Mapping**
   ```
   SoloWipe Job → QuickBooks Invoice
   - customer → Customer
   - amount_collected → Amount
   - completed_at → Invoice Date
   - description → Line Item Description
   - job_id → Custom Field (for tracking)
   ```

3. **Edge Function: `quickbooks-create-invoice`**
   - Triggered on job completion (if QuickBooks connected)
   - Create invoice in QuickBooks
   - Store QuickBooks invoice ID in jobs table
   - Handle payment status

4. **Database Schema Updates**
   ```sql
   ALTER TABLE jobs ADD COLUMN quickbooks_invoice_id TEXT;
   ALTER TABLE jobs ADD COLUMN quickbooks_synced_at TIMESTAMPTZ;
   ```

#### Deliverables
- Invoices automatically created in QuickBooks
- Invoice IDs stored for tracking
- Sync status visible in UI

---

### Phase 4: Payment Sync (Week 3)

#### Tasks
1. **Payment Mapping**
   - Map SoloWipe payment status to QuickBooks payment
   - Handle different payment methods (Cash, Transfer, GoCardless)
   - Sync payment date and amount

2. **Payment Sync Logic**
   - When job marked as paid → Record payment in QuickBooks
   - Link payment to invoice
   - Handle partial payments (if applicable)

3. **Edge Function: `quickbooks-record-payment`**
   - Record payment in QuickBooks
   - Link to existing invoice
   - Update invoice status

#### Deliverables
- Payments automatically recorded in QuickBooks
- Invoice status updated correctly
- Payment history synced

---

### Phase 5: UI Integration (Week 3-4)

#### Tasks
1. **Settings Page Updates**
   - Add QuickBooks connection section
   - Show connection status
   - Allow disconnect/reconnect
   - Show last sync time

2. **Job Completion Flow**
   - Show QuickBooks sync status
   - Display sync errors if any
   - Allow manual retry

3. **Sync Status Indicators**
   - Badge on jobs showing sync status
   - Sync history/logs
   - Error notifications

#### Deliverables
- User-friendly QuickBooks connection UI
- Clear sync status indicators
- Error handling and retry mechanisms

---

## 4. Technical Details

### OAuth Flow
1. User clicks "Connect QuickBooks" in Settings
2. Redirect to QuickBooks authorization page
3. User authorizes access
4. QuickBooks redirects to callback URL with code
5. Exchange code for access token
6. Store encrypted tokens in database

### Token Management
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 101 days
- **Auto-refresh**: Refresh token before expiry
- **Encryption**: Use same encryption as GoCardless tokens

### API Endpoints Needed
- `POST /v3/company/{realmId}/customer` - Create customer
- `PUT /v3/company/{realmId}/customer` - Update customer
- `POST /v3/company/{realmId}/invoice` - Create invoice
- `POST /v3/company/{realmId}/payment` - Record payment
- `GET /v3/company/{realmId}/query` - Query data

### Error Handling
- **Token Expired**: Auto-refresh and retry
- **API Rate Limits**: Implement exponential backoff
- **Invalid Data**: Log error, notify user, allow manual fix
- **Network Errors**: Retry with exponential backoff

---

## 5. Security Considerations

### Data Protection
- Encrypt access/refresh tokens at rest
- Use HTTPS for all API calls
- Store realm ID securely
- Never log sensitive data

### Access Control
- Users can only access their own QuickBooks data
- Verify user ownership before syncing
- RLS policies on all database operations

### Compliance
- GDPR compliant (user data)
- QuickBooks API terms of service
- Data retention policies

---

## 6. Testing Plan

### Unit Tests
- Token encryption/decryption
- API request formatting
- Data mapping logic
- Error handling

### Integration Tests
- OAuth flow end-to-end
- Customer sync
- Invoice creation
- Payment recording

### User Acceptance Testing
- Real QuickBooks accounts
- Various scenarios (new customers, updates, errors)
- Performance testing

---

## 7. Rollout Plan

### Phase 1: Beta Testing (Week 4)
- Select 5-10 beta users
- Monitor for issues
- Gather feedback

### Phase 2: Limited Release (Week 5)
- Release to 20% of users
- Monitor error rates
- Fix critical issues

### Phase 3: Full Release (Week 6)
- Release to all users
- Marketing announcement
- Support documentation

---

## 8. Documentation

### User Documentation
- How to connect QuickBooks
- What data syncs
- Troubleshooting guide
- FAQ

### Developer Documentation
- API integration details
- Error codes
- Webhook handling
- Maintenance procedures

---

## 9. Future Enhancements

### Phase 2 Features (Post-Launch)
- **Bulk Sync**: Sync historical data
- **Two-Way Sync**: Sync changes from QuickBooks to SoloWipe
- **Expense Tracking**: Sync expenses to QuickBooks
- **Tax Reporting**: Generate tax reports
- **Multi-Currency**: Support for different currencies

---

## 10. Resources Required

### Development
- 1 Full-stack developer (3-4 weeks)
- QuickBooks developer account
- Test QuickBooks accounts

### Infrastructure
- Supabase Edge Functions (existing)
- Database storage (minimal increase)
- API rate limit management

### Costs
- QuickBooks API: Free (included with QuickBooks subscription)
- Development time: 3-4 weeks
- Testing accounts: Free (sandbox mode)

---

## 11. Risk Assessment

### Technical Risks
- **API Changes**: QuickBooks may update API (mitigation: version pinning)
- **Rate Limits**: May hit rate limits with many users (mitigation: queuing system)
- **Data Conflicts**: Conflicts between SoloWipe and QuickBooks (mitigation: clear sync rules)

### Business Risks
- **User Adoption**: Users may not use QuickBooks (mitigation: clear value proposition)
- **Support Burden**: Integration issues may increase support (mitigation: good documentation)

---

## 12. Success Criteria

### Technical
- ✅ OAuth flow works reliably
- ✅ 99%+ sync success rate
- ✅ <2 second average sync time
- ✅ Automatic token refresh working

### Business
- ✅ 30%+ of users connect QuickBooks within 3 months
- ✅ Positive user feedback
- ✅ Reduced support tickets related to accounting
- ✅ Increased user retention

---

## 13. Next Steps

### Immediate (This Week)
1. Register QuickBooks developer account
2. Create app in QuickBooks developer portal
3. Set up OAuth redirect URI
4. Begin Phase 1 implementation

### Short-term (Next 2 Weeks)
1. Complete OAuth implementation
2. Start customer sync development
3. Set up test accounts

### Medium-term (Next Month)
1. Complete all sync functionality
2. UI integration
3. Beta testing
4. Documentation

---

## 14. Questions & Considerations

### Open Questions
1. Should we support QuickBooks Desktop? (Answer: Start with Online only)
2. How to handle invoice numbering? (Answer: Use QuickBooks numbering)
3. Should we sync historical data? (Answer: No, start fresh)
4. How to handle failed syncs? (Answer: Retry queue with manual retry option)

### Decisions Made
- ✅ Start with QuickBooks Online only
- ✅ One-way sync (SoloWipe → QuickBooks)
- ✅ Sync on job completion (real-time)
- ✅ Store QuickBooks IDs for tracking
- ✅ Encrypt tokens same way as GoCardless

---

## Conclusion

The QuickBooks integration will significantly enhance SoloWipe's value proposition by eliminating manual accounting work. The 3-4 week implementation timeline is achievable with focused development effort. The integration follows the same patterns as the existing GoCardless integration, making it a natural extension of the platform.

**Recommended Start Date:** Week of [TBD]  
**Target Completion:** [TBD + 4 weeks]  
**Priority:** High (requested in immediate action items)





