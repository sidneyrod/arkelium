-- Add archive columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS archived_by uuid NULL;

-- Add foreign key for archived_by
ALTER TABLE public.companies 
ADD CONSTRAINT companies_archived_by_fkey 
FOREIGN KEY (archived_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Drop the DELETE policy on companies (we'll use archive instead)
DROP POLICY IF EXISTS "Admins can delete their companies" ON public.companies;

-- Update RLS for activity_logs to support multi-company admins
-- First drop existing SELECT policies
DROP POLICY IF EXISTS "Admins and managers can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view their company's activity logs" ON public.activity_logs;

-- Create new SELECT policy for multi-company admins
CREATE POLICY "Users can view activity logs of their companies"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  company_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = activity_logs.company_id
      AND ur.role IN ('admin', 'manager')
      AND ur.status = 'active'
  )
);

-- Drop existing INSERT policy and create new one
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;

CREATE POLICY "Users can insert activity logs for their companies"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = activity_logs.company_id
      AND ur.status = 'active'
  )
);