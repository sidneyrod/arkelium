-- Add request_type column to absence_requests table
ALTER TABLE public.absence_requests 
ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'time_off';

-- Add comment for documentation
COMMENT ON COLUMN public.absence_requests.request_type IS 'Type of off request: time_off (folga), vacation (férias), personal (indisponibilidade pessoal)';

-- Create index for faster queries on status and date range
CREATE INDEX IF NOT EXISTS idx_absence_requests_status_dates 
ON public.absence_requests (company_id, cleaner_id, status, start_date, end_date);

-- Create index for approved requests lookup (critical for schedule blocking)
CREATE INDEX IF NOT EXISTS idx_absence_requests_approved 
ON public.absence_requests (company_id, status, start_date, end_date) 
WHERE status = 'approved';