export interface Profile {
  id: string;
  business_name: string;
  google_review_link: string | null;
  created_at: string;
  // Stripe subscription fields
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null;
  subscription_ends_at: string | null;
  // GoCardless connection fields
  gocardless_access_token_encrypted: string | null;
  gocardless_organisation_id: string | null;
  gocardless_connected_at: string | null;
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
  payment_status: 'unpaid' | 'paid';
  payment_method: 'gocardless' | 'cash' | 'transfer' | null;
  payment_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  cancelled_at: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface JobWithCustomer extends Job {
  customer: Customer;
}
