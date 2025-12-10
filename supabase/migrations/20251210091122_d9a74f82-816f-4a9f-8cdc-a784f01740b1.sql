-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'My Window Cleaning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  mobile_phone TEXT,
  price NUMERIC NOT NULL DEFAULT 20,
  frequency_weeks INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gocardless_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMPTZ,
  amount_collected NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Customers policies
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own customers"
  ON public.customers FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own customers"
  ON public.customers FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own customers"
  ON public.customers FOR DELETE
  USING (profile_id = auth.uid());

-- Jobs policies (through customer ownership)
CREATE POLICY "Users can view jobs for their customers"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert jobs for their customers"
  ON public.jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs for their customers"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete jobs for their customers"
  ON public.jobs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'My Window Cleaning'));
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();