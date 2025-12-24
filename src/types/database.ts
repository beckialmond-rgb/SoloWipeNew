export interface Profile {
  id: string;
  business_name: string;
  google_review_link: string | null;
  created_at: string;
  // Stripe subscription fields
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing' | string | null;
  subscription_ends_at: string | null;
  // Grace period fields
  grace_period_ends_at: string | null;
  subscription_grace_period: boolean | null;
  // GoCardless connection fields
  gocardless_access_token_encrypted: string | null;
  gocardless_organisation_id: string | null;
  gocardless_connected_at: string | null;
  // Business targets
  weekly_target: number | null;
  monthly_goal: number | null;
}

export interface Customer {
  id: string;
  profile_id: string;
  name: string;
  address: string;
  mobile_phone: string | null;
  price: number;
  frequency_weeks: number;
  status: 'active' | 'inactive';
  gocardless_id: string | null;
  gocardless_mandate_status: string | null;
  notes: string | null;
  archived_at: string | null;
  is_archived: boolean;
  is_scrubbed: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Job {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
  amount_collected: number | null;
  payment_status: 'unpaid' | 'processing' | 'paid';
  payment_method: 'gocardless' | 'cash' | 'transfer' | null;
  payment_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  cancelled_at: string | null;
  photo_url: string | null;
  order_index: number | null;
  // GoCardless payment tracking
  gocardless_payment_id: string | null;
  gocardless_payment_status: string | null;
  // Fee tracking for financial reporting (GoCardless payments only)
  platform_fee: number | null;
  gocardless_fee: number | null;
  net_amount: number | null;
  created_at: string;
}

export interface JobWithCustomer extends Job {
  customer: Customer;
}

export interface UsageCounter {
  id: string;
  profile_id: string;
  jobs_completed_count: number;
  sms_sent_count: number;
  free_jobs_limit: number;
  free_sms_limit: number;
  jobs_limit_hit_at: string | null;
  sms_limit_hit_at: string | null;
  created_at: string;
  updated_at: string;
}
