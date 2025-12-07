-- =============================================
-- MULTI-TENANT ENTERPRISE SAAS DATABASE SCHEMA
-- Owner: ARKELIUM | Example Tenant: TidyOut
-- =============================================

-- 1. Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cleaner');

-- 2. Companies table (tenants)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  province TEXT DEFAULT 'Ontario',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Company branding table
CREATE TABLE public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1a3d2e',
  secondary_color TEXT DEFAULT '#2d5a45',
  accent_color TEXT DEFAULT '#4ade80',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 4. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  hourly_rate DECIMAL(10,2),
  salary DECIMAL(10,2),
  employment_type TEXT DEFAULT 'full-time',
  primary_province TEXT DEFAULT 'Ontario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'cleaner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 6. Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  client_type TEXT DEFAULT 'residential',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Client locations table
CREATE TABLE public.client_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  province TEXT DEFAULT 'Ontario',
  postal_code TEXT,
  access_instructions TEXT,
  alarm_code TEXT,
  has_pets BOOLEAN DEFAULT false,
  pet_details TEXT,
  parking_info TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Client billing/payment methods
CREATE TABLE public.client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'credit_card',
  last_four TEXT,
  label TEXT,
  expiry_date TEXT,
  is_default BOOLEAN DEFAULT false,
  billing_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Jobs/Schedule table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL,
  cleaner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  job_type TEXT DEFAULT 'regular',
  notes TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL,
  cleaner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  service_date DATE,
  service_duration TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 13.00,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Invoice line items
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  frequency TEXT DEFAULT 'weekly',
  services TEXT[],
  monthly_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  terms_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  accepted_ip TEXT,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Payroll periods
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_gross DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  total_net DECIMAL(10,2) DEFAULT 0,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Payroll entries (per employee per period)
CREATE TABLE public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  gross_pay DECIMAL(10,2) DEFAULT 0,
  cpp_deduction DECIMAL(10,2) DEFAULT 0,
  ei_deduction DECIMAL(10,2) DEFAULT 0,
  tax_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Company estimate configuration
CREATE TABLE public.company_estimate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  default_hourly_rate DECIMAL(10,2) DEFAULT 35.00,
  tax_rate DECIMAL(5,2) DEFAULT 13.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 16. Extra service fees
CREATE TABLE public.extra_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_percentage BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Schedule checklist items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Cleaner availability
CREATE TABLE public.cleaner_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cleaner_id, day_of_week)
);

-- 19. Absence requests
CREATE TABLE public.absence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Activity log
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_estimate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
      AND company_id = public.get_user_company_id()
  )
$$;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
      AND company_id = public.get_user_company_id()
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id() AND public.has_role('admin'));

-- Company branding policies
CREATE POLICY "Users can view their company branding"
  ON public.company_branding FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage company branding"
  ON public.company_branding FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Profiles policies
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_user_company_id() OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their company"
  ON public.profiles FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- User roles policies
CREATE POLICY "Users can view roles in their company"
  ON public.user_roles FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage roles in their company"
  ON public.user_roles FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Clients policies
CREATE POLICY "Users can view clients in their company"
  ON public.clients FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admin/Manager can manage clients"
  ON public.clients FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Client locations policies
CREATE POLICY "Users can view client locations in their company"
  ON public.client_locations FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admin/Manager can manage client locations"
  ON public.client_locations FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Client payment methods policies
CREATE POLICY "Admin/Manager can view payment methods"
  ON public.client_payment_methods FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Admin/Manager can manage payment methods"
  ON public.client_payment_methods FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Jobs policies
CREATE POLICY "Users can view jobs in their company"
  ON public.jobs FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admin/Manager can manage all jobs"
  ON public.jobs FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Cleaners can update their own jobs"
  ON public.jobs FOR UPDATE
  USING (company_id = public.get_user_company_id() AND cleaner_id = auth.uid());

-- Invoices policies
CREATE POLICY "Admin/Manager can view invoices"
  ON public.invoices FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Admin/Manager can manage invoices"
  ON public.invoices FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Invoice items policies
CREATE POLICY "Users can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id()
  ));

CREATE POLICY "Admin/Manager can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id() AND public.is_admin_or_manager()
  ));

-- Contracts policies
CREATE POLICY "Users can view contracts"
  ON public.contracts FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admin/Manager can manage contracts"
  ON public.contracts FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Payroll policies
CREATE POLICY "Admin/Manager can view payroll periods"
  ON public.payroll_periods FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Admins can manage payroll periods"
  ON public.payroll_periods FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

CREATE POLICY "Employees can view their payroll entries"
  ON public.payroll_entries FOR SELECT
  USING (company_id = public.get_user_company_id() AND (employee_id = auth.uid() OR public.is_admin_or_manager()));

CREATE POLICY "Admins can manage payroll entries"
  ON public.payroll_entries FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Estimate config policies
CREATE POLICY "Users can view estimate config"
  ON public.company_estimate_config FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage estimate config"
  ON public.company_estimate_config FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Extra fees policies
CREATE POLICY "Users can view extra fees"
  ON public.extra_fees FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage extra fees"
  ON public.extra_fees FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Checklist items policies
CREATE POLICY "Users can view checklist items"
  ON public.checklist_items FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage checklist items"
  ON public.checklist_items FOR ALL
  USING (company_id = public.get_user_company_id() AND public.has_role('admin'));

-- Cleaner availability policies
CREATE POLICY "Users can view availability in their company"
  ON public.cleaner_availability FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can manage their own availability"
  ON public.cleaner_availability FOR ALL
  USING (company_id = public.get_user_company_id() AND cleaner_id = auth.uid());

CREATE POLICY "Admin/Manager can manage all availability"
  ON public.cleaner_availability FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Absence requests policies
CREATE POLICY "Users can view absence requests in their company"
  ON public.absence_requests FOR SELECT
  USING (company_id = public.get_user_company_id() AND (cleaner_id = auth.uid() OR public.is_admin_or_manager()));

CREATE POLICY "Users can create their own absence requests"
  ON public.absence_requests FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id() AND cleaner_id = auth.uid());

CREATE POLICY "Admin/Manager can manage absence requests"
  ON public.absence_requests FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

-- Activity logs policies
CREATE POLICY "Admin/Manager can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Users can create activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_branding_updated_at BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_locations_updated_at BEFORE UPDATE ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_payment_methods_updated_at BEFORE UPDATE ON public.client_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_estimate_config_updated_at BEFORE UPDATE ON public.company_estimate_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extra_fees_updated_at BEFORE UPDATE ON public.extra_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cleaner_availability_updated_at BEFORE UPDATE ON public.cleaner_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_absence_requests_updated_at BEFORE UPDATE ON public.absence_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: Auto-create profile on user signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKET FOR LOGOS, CONTRACTS, INVOICES
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Storage policies
CREATE POLICY "Public can view company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view documents in their company"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated');