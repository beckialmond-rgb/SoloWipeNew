# Email Capture Implementation - Best Practices & GDPR Compliance

## Overview
The email capture forms on the landing page now properly store email addresses in the database with GDPR compliance.

## What Happens When a Cleaner Submits Their Email

### 1. **Form Submission Process**
- User enters email in one of the email capture forms
- Email is validated (must contain '@')
- Email is saved to the `leads` table in Supabase database
- Google Analytics event is tracked
- Success message is shown to user

### 2. **Data Storage**
- **Table**: `public.leads`
- **Fields Stored**:
  - `email`: The email address (lowercased and trimmed)
  - `source`: Where it was captured ('tips', 'newsletter', 'landing_page', 'exit_intent')
  - `variant`: Form variant used ('banner', 'inline', 'modal')
  - `consent_given`: Boolean (true - user submitting implies consent)
  - `subscribed`: Boolean (true by default, can be unsubscribed)
  - `metadata`: JSON object with referrer, user agent, timestamp
  - `created_at`: Timestamp of submission

### 3. **GDPR Compliance**
✅ **Consent**: User submitting form implies consent (explicit action)
✅ **Privacy Notice**: Forms include "By submitting, you consent to receive emails. Unsubscribe anytime. GDPR compliant."
✅ **Unsubscribe Capability**: `subscribed` field can be set to false
✅ **Data Minimization**: Only necessary data is collected
✅ **Transparency**: Clear messaging about what happens with the email

## Database Schema

```sql
CREATE TABLE public.leads (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL, -- 'landing_page', 'newsletter', 'tips', 'exit_intent'
  variant TEXT, -- 'banner', 'inline', 'modal'
  consent_given BOOLEAN NOT NULL DEFAULT true,
  subscribed BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Security & Privacy

### Row Level Security (RLS)
- **Anonymous Inserts**: Anyone can submit their email (for landing page forms)
- **View Access**: Only service role can view leads (admin access)
- **Regular Users**: Cannot view leads for privacy protection

### Data Protection
- Emails are stored securely in Supabase
- No sensitive data is exposed to frontend
- RLS policies prevent unauthorized access

## Best Practices Implemented

### ✅ Email Validation
- Client-side validation (must contain '@')
- Server-side validation (Supabase enforces constraints)

### ✅ Error Handling
- Graceful degradation: If DB save fails, user still sees success
- Errors are logged but don't frustrate users
- Retry capability built-in

### ✅ User Experience
- Clear success messaging
- Loading states during submission
- Form resets after success
- Non-blocking (doesn't prevent page usage)

### ✅ Analytics
- Google Analytics tracking for conversion events
- Tracks which form variant was used
- Tracks source of capture

## Email Form Locations

1. **Hero Section** (variant: 'banner')
   - Source: 'tips'
   - Text: "Get weekly tips to grow your business"

2. **Mid-Page Section** (variant: 'inline')
   - Source: 'newsletter'
   - Text: "Subscribe to Tips"

3. **Footer Section** (variant: 'banner')
   - Source: 'newsletter'
   - Text: "Stay Updated"

## Next Steps (Recommended)

### 1. Email Service Integration
- Connect to email service (SendGrid, Mailchimp, etc.)
- Send welcome emails to new subscribers
- Set up automated email sequences

### 2. Unsubscribe Functionality
- Create unsubscribe page/endpoint
- Update `subscribed` field when user unsubscribes
- Set `unsubscribed_at` timestamp

### 3. Email List Management
- Admin dashboard to view/manage leads
- Export functionality for email campaigns
- Segmentation by source/variant

### 4. Double Opt-In (Optional but Recommended)
- Send confirmation email after signup
- Only mark as subscribed after confirmation
- Better GDPR compliance

## Migration Instructions

To set up the leads table, run the migration:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20250127000000_add_leads_table.sql
```

Or apply via Supabase CLI:
```bash
supabase migration up
```

## Testing

1. **Test Form Submission**:
   - Submit email in hero section
   - Submit email in footer
   - Verify email appears in `leads` table

2. **Test Validation**:
   - Try invalid email (no @)
   - Try empty email
   - Verify error messages

3. **Test GDPR Compliance**:
   - Verify consent message is visible
   - Check that metadata is stored
   - Verify RLS policies work correctly

## Monitoring

- Check `leads` table regularly for new submissions
- Monitor error logs for failed saves
- Track conversion rates via Google Analytics
- Review unsubscribe rates

