-- Add indexes for better query performance

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- Indexes for client_locations
CREATE INDEX IF NOT EXISTS idx_client_locations_client_id ON public.client_locations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_company_id ON public.client_locations(company_id);

-- Indexes for client_payment_methods
CREATE INDEX IF NOT EXISTS idx_client_payment_methods_client_id ON public.client_payment_methods(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_methods_company_id ON public.client_payment_methods(company_id);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_cleaner_id ON public.jobs(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON public.jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

-- Indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_service_date ON public.invoices(service_date);

-- Indexes for invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Indexes for payroll_periods
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_id ON public.payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON public.payroll_periods(status);

-- Indexes for payroll_entries
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON public.payroll_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_company_id ON public.payroll_entries(company_id);

-- Indexes for absence_requests
CREATE INDEX IF NOT EXISTS idx_absence_requests_cleaner_id ON public.absence_requests(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_company_id ON public.absence_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_status ON public.absence_requests(status);

-- Indexes for cleaner_availability
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner_id ON public.cleaner_availability(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_company_id ON public.cleaner_availability(company_id);

-- Indexes for company_branding
CREATE INDEX IF NOT EXISTS idx_company_branding_company_id ON public.company_branding(company_id);

-- Indexes for company_estimate_config
CREATE INDEX IF NOT EXISTS idx_company_estimate_config_company_id ON public.company_estimate_config(company_id);

-- Indexes for extra_fees
CREATE INDEX IF NOT EXISTS idx_extra_fees_company_id ON public.extra_fees(company_id);

-- Indexes for checklist_items
CREATE INDEX IF NOT EXISTS idx_checklist_items_company_id ON public.checklist_items(company_id);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);