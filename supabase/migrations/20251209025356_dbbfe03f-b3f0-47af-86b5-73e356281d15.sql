-- Add website column to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;

-- Enable realtime for companies table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;