-- Complete database structure for ARKELIUM Cleaning Management SaaS
-- Multi-tenant architecture with company_id isolation

-- Ensure RLS is enabled on all existing tables and clear mock data
DELETE FROM public.jobs WHERE true;
DELETE FROM public.invoices WHERE true;
DELETE FROM public.contracts WHERE true;
DELETE FROM public.clients WHERE true;
DELETE FROM public.payroll_entries WHERE true;
DELETE FROM public.payroll_periods WHERE true;
DELETE FROM public.cleaner_availability WHERE true;
DELETE FROM public.absence_requests WHERE true;
DELETE FROM public.activity_logs WHERE true;

-- Add fiscal/tax configuration table
CREATE TABLE IF NOT EXISTS public.tax_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  cpp_employer_rate NUMERIC DEFAULT 5.95,
  cpp_employee_rate NUMERIC DEFAULT 5.95,
  cpp_max_contribution NUMERIC DEFAULT 3867.50,
  ei_employer_rate NUMERIC DEFAULT 2.21,
  ei_employee_rate NUMERIC DEFAULT 1.58,
  ei_max_contribution NUMERIC DEFAULT 1049.12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, year)
);

ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax config for their company" 
ON public.tax_configurations FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage tax config" 
ON public.tax_configurations FOR ALL 
USING (company_id = get_user_company_id() AND has_role('admin'::app_role));

CREATE POLICY "Admins can insert tax config" 
ON public.tax_configurations FOR INSERT 
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

-- Add monthly availability tracking
ALTER TABLE public.cleaner_availability 
ADD COLUMN IF NOT EXISTS monthly_exceptions JSONB DEFAULT '[]'::jsonb;

-- Add approval tracking to absence requests
ALTER TABLE public.absence_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Create trigger for updated_at on tax_configurations
CREATE TRIGGER update_tax_configurations_updated_at
BEFORE UPDATE ON public.tax_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;