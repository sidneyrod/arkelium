
-- Fix: Allow company deletion by changing activity_logs FK behavior
-- Instead of CASCADE (which triggers the audit immutability error), 
-- we'll use SET NULL to preserve audit logs while allowing company deletion

-- First, drop the existing foreign key constraint
ALTER TABLE public.activity_logs 
DROP CONSTRAINT IF EXISTS activity_logs_company_id_fkey;

-- Make company_id nullable to allow orphaned logs
ALTER TABLE public.activity_logs 
ALTER COLUMN company_id DROP NOT NULL;

-- Re-add the foreign key with SET NULL behavior
ALTER TABLE public.activity_logs 
ADD CONSTRAINT activity_logs_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE SET NULL;

-- Also need to handle user_roles - when company is deleted, user roles should be deleted
-- But first check if there's any issue with the current constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_company_id_fkey;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;
