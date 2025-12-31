export interface Profile {
  id: string;
  business_name: string;
  google_review_link: string | null;
  created_at: string;
  // Role field (Phase 4: Explicit role management)
  role: 'owner' | 'helper' | 'both' | null;
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
  preferred_payment_method: 'gocardless' | 'cash' | 'transfer' | null;
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
  // Revenue split tracking
  helper_payment_amount: number | null;
  created_at: string;
}

export interface JobWithCustomer extends Job {
  customer: Customer;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  created_at: string;
}

export interface JobAssignmentWithUser extends JobAssignment {
  assigned_to?: {
    id: string;
    email: string;
    // Profile data can be joined if needed
  };
  assigned_by?: {
    id: string;
    email: string;
  };
}

export interface JobWithCustomerAndAssignment extends JobWithCustomer {
  assignment?: JobAssignmentWithUser; // Deprecated: use assignments instead
  assignments?: JobAssignmentWithUser[]; // Multiple assignments per job
}

export interface TeamMember {
  id: string;
  owner_id: string;
  helper_id: string;
  helper_email: string;
  helper_name: string | null;
  added_at: string;
  created_at: string;
  // Revenue split
  commission_percentage: number;
  // Invite tracking fields
  invite_token?: string | null;
  invited_at?: string | null;
  invite_expires_at?: string | null;
  invite_accepted_at?: string | null;
}

export interface TeamMemberWithBilling extends TeamMember {
  is_active: boolean;
  billing_started_at: string | null;
  billing_stopped_at: string | null;
  stripe_subscription_item_id: string | null;
}

export interface Helper {
  id: string;
  email: string;
  name?: string;
  initials: string;
  isTeamMember?: boolean; // True if added via team_members table
  isPlaceholder?: boolean; // True if helper hasn't signed up yet
  hasPendingInvite?: boolean; // True if invite sent but not accepted
  inviteExpiresAt?: string | null; // When invite expires
}

/**
 * Email context information for helper sign-up flow
 * Used to detect if an email belongs to a placeholder helper
 */
export interface EmailContext {
  isHelper?: boolean; // True if email exists in team_members table
  isPlaceholder?: boolean; // True if helper hasn't signed up yet
  ownerName?: string; // Name of the owner who invited this helper
  isNewUser?: boolean; // True if this is a new user signing up
}

/**
 * Invite data for helper invitation flow
 * Contains information about a helper invite token
 */
export interface InviteData {
  ownerName?: string; // Name of the owner who sent the invite
  helperEmail?: string; // Email of the helper being invited
  isValid?: boolean; // Whether the invite token is valid
  isExpired?: boolean; // Whether the invite token has expired
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

export interface Notification {
  id: string;
  user_id: string;
  type: 'job_assigned' | 'job_unassigned' | 'bulk_assigned';
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  job_id?: string | null;
}

export interface AssignmentTemplate {
  id: string;
  owner_id: string;
  name: string;
  helper_ids: string[];
  created_at: string;
}

export interface HelperSchedule {
  id: string;
  owner_id: string;
  helper_id: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  round_name: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  owner_id: string;
  amount: number;
  category: 'cleaning_supplies' | 'fuel' | 'equipment' | 'misc';
  date: string;
  job_id: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpenseWithJob extends Expense {
  job?: JobWithCustomer;
}

export interface HelperInvoice {
  id: string;
  owner_id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  helper_count: number;
  stripe_invoice_id: string | null;
  generated_at: string;
  created_at: string;
}

export interface HelperInvoiceItem {
  id: string;
  invoice_id: string;
  team_member_id: string;
  helper_name: string | null;
  billing_start_date: string;
  billing_end_date: string | null;
  days_billed: number;
  monthly_rate: number;
  amount: number;
  created_at: string;
}

export interface HelperInvoiceWithItems extends HelperInvoice {
  items: HelperInvoiceItem[];
}

// ============================================================================
// Helper Invoicing & Payment System Types
// ============================================================================

export interface HelperEarningsInvoice {
  id: string;
  owner_id: string;
  helper_id: string;
  invoice_number: string;
  invoice_date: string;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  subtotal: number;
  total_amount: number;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issued_at: string | null;
  paid_at: string | null;
  amount_paid: number;
  outstanding_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelperEarningsInvoiceItem {
  id: string;
  invoice_id: string;
  job_id: string;
  job_date: string;
  customer_name: string;
  job_amount: number;
  helper_payment_amount: number;
  description: string | null;
  created_at: string;
}

export interface HelperEarningsPayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'other';
  payment_reference: string | null;
  amount: number;
  notes: string | null;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface HelperEarningsInvoiceWithItems extends HelperEarningsInvoice {
  items: HelperEarningsInvoiceItem[];
  payments: HelperEarningsPayment[];
}

export interface HelperEarningsInvoiceAuditLog {
  id: string;
  invoice_id: string | null;
  payment_id: string | null;
  action: 'invoice_created' | 'invoice_issued' | 'invoice_paid' | 'invoice_cancelled' | 'invoice_updated' | 'payment_created' | 'payment_updated' | 'payment_deleted' | 'job_linked_to_invoice';
  user_id: string;
  changes: Record<string, any>;
  created_at: string;
}

export interface JobAvailableForInvoicing {
  job_id: string;
  job_date: string;
  customer_name: string;
  job_amount: number;
  helper_payment_amount: number;
  completed_at: string;
}

export interface HelperInvoiceSummary {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  draft_count: number;
  issued_count: number;
  paid_count: number;
}
