-- Add invoice generation mode setting to company_estimate_config table
ALTER TABLE public.company_estimate_config 
ADD COLUMN IF NOT EXISTS invoice_generation_mode text NOT NULL DEFAULT 'manual';

-- Add comment explaining the options
COMMENT ON COLUMN public.company_estimate_config.invoice_generation_mode IS 'Options: automatic (generate on job completion) or manual (via Completed Services screen)';