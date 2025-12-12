export interface Profile {
  id: string;
  business_name: string;
  google_review_link: string | null;
  created_at: string;
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
