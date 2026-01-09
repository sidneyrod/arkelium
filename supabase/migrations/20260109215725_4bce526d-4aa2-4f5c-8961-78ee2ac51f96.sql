-- Add company operational preferences columns
ALTER TABLE public.company_estimate_config
ADD COLUMN IF NOT EXISTS include_visits_in_reports BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_cash_kept_by_employee BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.company_estimate_config.include_visits_in_reports IS 'When true, prospecting visits (with $0 revenue) are included in Work & Time Tracking reports';
COMMENT ON COLUMN public.company_estimate_config.enable_cash_kept_by_employee IS 'When true, employees can keep cash payments (deducted from payroll) with admin approval workflow';