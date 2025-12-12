-- Add timezone field to companies table for Canadian timezone support
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Toronto';

-- Add comment explaining the field
COMMENT ON COLUMN public.companies.timezone IS 'IANA timezone identifier for the company (e.g., America/Toronto, America/Vancouver)';