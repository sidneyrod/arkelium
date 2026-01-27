-- Add default_dashboard_company_id to profiles table
-- This stores the user's preferred company to load on Dashboard startup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_dashboard_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.default_dashboard_company_id IS 'User preference for which company data to display on Dashboard startup';