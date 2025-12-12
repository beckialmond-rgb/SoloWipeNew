import { useState } from 'react';
import { Customer, JobWithCustomer } from '@/types/database';
import { format, addDays, addWeeks } from 'date-fns';

// Generate seed data for demo purposes
const generateDemoCustomers = (): Customer[] => [
  {
    id: '1',
    profile_id: 'demo',
    name: 'Mrs. Thompson',
    address: '14 High Street, Manchester',
    mobile_phone: '+447700900123',
    price: 25,
    frequency_weeks: 4,
    status: 'active',
    gocardless_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    profile_id: 'demo',
    name: 'Mr. Williams',
    address: '22 Maple Drive, Leeds',
    mobile_phone: '+447700900456',
    price: 20,
    frequency_weeks: 4,
    status: 'active',
    gocardless_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    profile_id: 'demo',
    name: 'The Patels',
    address: '8 Oak Avenue, Birmingham',
    mobile_phone: '+447700900789',
    price: 35,
    frequency_weeks: 2,
    status: 'active',
    gocardless_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    profile_id: 'demo',
    name: 'Mrs. O\'Brien',
    address: '45 Church Lane, Liverpool',
    mobile_phone: '+447700900321',
    price: 18,
    frequency_weeks: 4,
    status: 'active',
    gocardless_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    profile_id: 'demo',
    name: 'Dr. Singh',
    address: '101 Victoria Road, Sheffield',
    mobile_phone: '+447700900654',
    price: 30,
    frequency_weeks: 3,
    status: 'active',
    gocardless_id: null,
    created_at: new Date().toISOString(),
  },
];

const today = format(new Date(), 'yyyy-MM-dd');

const generateDemoJobs = (customers: Customer[]): JobWithCustomer[] => 
  customers.map((customer, index) => ({
    id: `job-${index + 1}`,
    customer_id: customer.id,
    scheduled_date: today,
    status: 'pending' as const,
    completed_at: null,
    amount_collected: null,
    payment_status: 'unpaid' as const,
    payment_method: null,
    payment_date: null,
    invoice_number: null,
    created_at: new Date().toISOString(),
    customer,
  }));

export function useDemoData() {
  const [customers] = useState<Customer[]>(generateDemoCustomers);
  const [jobs, setJobs] = useState<JobWithCustomer[]>(() => generateDemoJobs(generateDemoCustomers()));
  const [completedToday, setCompletedToday] = useState<JobWithCustomer[]>([]);
  const businessName = 'SoloWipe Pro';

  const pendingJobs = jobs.filter(job => job.status === 'pending');
  const todayEarnings = completedToday.reduce((sum, job) => sum + (job.amount_collected || 0), 0);

  const completeJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return null;

    const completedJob: JobWithCustomer = {
      ...job,
      status: 'completed',
      completed_at: new Date().toISOString(),
      amount_collected: job.customer.price,
    };

    // Create next scheduled job
    const nextDate = addWeeks(new Date(), job.customer.frequency_weeks);
    const newJob: JobWithCustomer = {
      id: `job-${Date.now()}`,
      customer_id: job.customer_id,
      scheduled_date: format(nextDate, 'yyyy-MM-dd'),
      status: 'pending',
      completed_at: null,
      amount_collected: null,
      payment_status: 'unpaid' as const,
      payment_method: null,
      payment_date: null,
      invoice_number: null,
      created_at: new Date().toISOString(),
      customer: job.customer,
    };

    setJobs(prev => [
      ...prev.filter(j => j.id !== jobId),
      newJob,
    ]);
    setCompletedToday(prev => [...prev, completedJob]);

    return {
      collectedAmount: job.customer.price,
      nextDate: format(nextDate, 'dd MMM yyyy'),
    };
  };

  return {
    customers,
    pendingJobs,
    completedToday,
    todayEarnings,
    businessName,
    completeJob,
  };
}
