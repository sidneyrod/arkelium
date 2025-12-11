-- Add column to company_estimate_config for admin is also cleaner setting
ALTER TABLE public.company_estimate_config 
ADD COLUMN IF NOT EXISTS admin_is_cleaner boolean DEFAULT false;