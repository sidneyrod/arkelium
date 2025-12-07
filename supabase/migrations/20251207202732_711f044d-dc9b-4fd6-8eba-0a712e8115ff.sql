-- Add missing foreign key constraints for data integrity

-- profiles.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_company_id_fkey'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- user_roles.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_company_id_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- user_roles.user_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- clients.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clients_company_id_fkey'
    ) THEN
        ALTER TABLE public.clients 
        ADD CONSTRAINT clients_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- client_locations.client_id -> clients.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_locations_client_id_fkey'
    ) THEN
        ALTER TABLE public.client_locations 
        ADD CONSTRAINT client_locations_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- client_locations.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_locations_company_id_fkey'
    ) THEN
        ALTER TABLE public.client_locations 
        ADD CONSTRAINT client_locations_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- client_payment_methods.client_id -> clients.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_payment_methods_client_id_fkey'
    ) THEN
        ALTER TABLE public.client_payment_methods 
        ADD CONSTRAINT client_payment_methods_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- client_payment_methods.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'client_payment_methods_company_id_fkey'
    ) THEN
        ALTER TABLE public.client_payment_methods 
        ADD CONSTRAINT client_payment_methods_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- jobs.client_id -> clients.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_client_id_fkey'
    ) THEN
        ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- jobs.location_id -> client_locations.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_location_id_fkey'
    ) THEN
        ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES public.client_locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- jobs.cleaner_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_cleaner_id_fkey'
    ) THEN
        ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_cleaner_id_fkey 
        FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- jobs.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_company_id_fkey'
    ) THEN
        ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- contracts.client_id -> clients.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contracts_client_id_fkey'
    ) THEN
        ALTER TABLE public.contracts 
        ADD CONSTRAINT contracts_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- contracts.location_id -> client_locations.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contracts_location_id_fkey'
    ) THEN
        ALTER TABLE public.contracts 
        ADD CONSTRAINT contracts_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES public.client_locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- contracts.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contracts_company_id_fkey'
    ) THEN
        ALTER TABLE public.contracts 
        ADD CONSTRAINT contracts_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- invoices.client_id -> clients.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_client_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- invoices.job_id -> jobs.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_job_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_job_id_fkey 
        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- invoices.location_id -> client_locations.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_location_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES public.client_locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- invoices.cleaner_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_cleaner_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_cleaner_id_fkey 
        FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- invoices.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_company_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT invoices_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- invoice_items.invoice_id -> invoices.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoice_items_invoice_id_fkey'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD CONSTRAINT invoice_items_invoice_id_fkey 
        FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
    END IF;
END $$;

-- payroll_periods.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_periods_company_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_periods 
        ADD CONSTRAINT payroll_periods_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- payroll_periods.approved_by -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_periods_approved_by_fkey'
    ) THEN
        ALTER TABLE public.payroll_periods 
        ADD CONSTRAINT payroll_periods_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- payroll_entries.period_id -> payroll_periods.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_entries_period_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_entries 
        ADD CONSTRAINT payroll_entries_period_id_fkey 
        FOREIGN KEY (period_id) REFERENCES public.payroll_periods(id) ON DELETE CASCADE;
    END IF;
END $$;

-- payroll_entries.employee_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_entries_employee_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_entries 
        ADD CONSTRAINT payroll_entries_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- payroll_entries.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_entries_company_id_fkey'
    ) THEN
        ALTER TABLE public.payroll_entries 
        ADD CONSTRAINT payroll_entries_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- absence_requests.cleaner_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'absence_requests_cleaner_id_fkey'
    ) THEN
        ALTER TABLE public.absence_requests 
        ADD CONSTRAINT absence_requests_cleaner_id_fkey 
        FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- absence_requests.approved_by -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'absence_requests_approved_by_fkey'
    ) THEN
        ALTER TABLE public.absence_requests 
        ADD CONSTRAINT absence_requests_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- absence_requests.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'absence_requests_company_id_fkey'
    ) THEN
        ALTER TABLE public.absence_requests 
        ADD CONSTRAINT absence_requests_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- cleaner_availability.cleaner_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cleaner_availability_cleaner_id_fkey'
    ) THEN
        ALTER TABLE public.cleaner_availability 
        ADD CONSTRAINT cleaner_availability_cleaner_id_fkey 
        FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- cleaner_availability.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cleaner_availability_company_id_fkey'
    ) THEN
        ALTER TABLE public.cleaner_availability 
        ADD CONSTRAINT cleaner_availability_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- company_branding.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'company_branding_company_id_fkey'
    ) THEN
        ALTER TABLE public.company_branding 
        ADD CONSTRAINT company_branding_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- company_estimate_config.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'company_estimate_config_company_id_fkey'
    ) THEN
        ALTER TABLE public.company_estimate_config 
        ADD CONSTRAINT company_estimate_config_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- extra_fees.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'extra_fees_company_id_fkey'
    ) THEN
        ALTER TABLE public.extra_fees 
        ADD CONSTRAINT extra_fees_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- checklist_items.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'checklist_items_company_id_fkey'
    ) THEN
        ALTER TABLE public.checklist_items 
        ADD CONSTRAINT checklist_items_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- activity_logs.company_id -> companies.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activity_logs_company_id_fkey'
    ) THEN
        ALTER TABLE public.activity_logs 
        ADD CONSTRAINT activity_logs_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- activity_logs.user_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activity_logs_user_id_fkey'
    ) THEN
        ALTER TABLE public.activity_logs 
        ADD CONSTRAINT activity_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;