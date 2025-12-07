-- Add updated_at triggers to all tables that need them

-- Trigger for absence_requests
DROP TRIGGER IF EXISTS update_absence_requests_updated_at ON public.absence_requests;
CREATE TRIGGER update_absence_requests_updated_at
    BEFORE UPDATE ON public.absence_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for checklist_items
DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON public.checklist_items;
CREATE TRIGGER update_checklist_items_updated_at
    BEFORE UPDATE ON public.checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for cleaner_availability
DROP TRIGGER IF EXISTS update_cleaner_availability_updated_at ON public.cleaner_availability;
CREATE TRIGGER update_cleaner_availability_updated_at
    BEFORE UPDATE ON public.cleaner_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for client_locations
DROP TRIGGER IF EXISTS update_client_locations_updated_at ON public.client_locations;
CREATE TRIGGER update_client_locations_updated_at
    BEFORE UPDATE ON public.client_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for client_payment_methods
DROP TRIGGER IF EXISTS update_client_payment_methods_updated_at ON public.client_payment_methods;
CREATE TRIGGER update_client_payment_methods_updated_at
    BEFORE UPDATE ON public.client_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for company_branding
DROP TRIGGER IF EXISTS update_company_branding_updated_at ON public.company_branding;
CREATE TRIGGER update_company_branding_updated_at
    BEFORE UPDATE ON public.company_branding
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for company_estimate_config
DROP TRIGGER IF EXISTS update_company_estimate_config_updated_at ON public.company_estimate_config;
CREATE TRIGGER update_company_estimate_config_updated_at
    BEFORE UPDATE ON public.company_estimate_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for contracts
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for extra_fees
DROP TRIGGER IF EXISTS update_extra_fees_updated_at ON public.extra_fees;
CREATE TRIGGER update_extra_fees_updated_at
    BEFORE UPDATE ON public.extra_fees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for jobs
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for payroll_entries
DROP TRIGGER IF EXISTS update_payroll_entries_updated_at ON public.payroll_entries;
CREATE TRIGGER update_payroll_entries_updated_at
    BEFORE UPDATE ON public.payroll_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for payroll_periods
DROP TRIGGER IF EXISTS update_payroll_periods_updated_at ON public.payroll_periods;
CREATE TRIGGER update_payroll_periods_updated_at
    BEFORE UPDATE ON public.payroll_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();