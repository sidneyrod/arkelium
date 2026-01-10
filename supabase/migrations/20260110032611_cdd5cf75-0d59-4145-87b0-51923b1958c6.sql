-- Add auto_generate_cash_receipt column to company_estimate_config
ALTER TABLE public.company_estimate_config 
ADD COLUMN IF NOT EXISTS auto_generate_cash_receipt boolean DEFAULT true;