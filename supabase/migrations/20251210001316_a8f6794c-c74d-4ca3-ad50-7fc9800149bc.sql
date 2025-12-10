-- Add payment fields to jobs table for tracking payment method
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_amount numeric,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS payment_received_by text,
ADD COLUMN IF NOT EXISTS payment_notes text;

-- Add payment fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_amount numeric,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS payment_received_by text,
ADD COLUMN IF NOT EXISTS payment_notes text;

-- Add job_type field to differentiate regular cleaning from visits
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'cleaning' CHECK (job_type IN ('cleaning', 'visit'));

-- Add visit-specific fields
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS visit_purpose text,
ADD COLUMN IF NOT EXISTS visit_route text;

-- Comment on columns for documentation
COMMENT ON COLUMN public.jobs.payment_method IS 'Payment method: e-transfer, cash';
COMMENT ON COLUMN public.jobs.payment_received_by IS 'Who received the cash payment: cleaner, company';
COMMENT ON COLUMN public.jobs.job_type IS 'Type of job: cleaning (billable) or visit (non-billable)';
COMMENT ON COLUMN public.jobs.visit_purpose IS 'Purpose of visit: inspection, quote, follow-up, etc.';
COMMENT ON COLUMN public.jobs.visit_route IS 'Route or instructions for the visit';