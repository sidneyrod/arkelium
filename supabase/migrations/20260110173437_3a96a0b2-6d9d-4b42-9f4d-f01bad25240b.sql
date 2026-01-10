-- The cash_collections table has ON DELETE NO ACTION (confdeltype=a) which also blocks company deletion
-- Change to SET NULL since cash_collections can exist with orphaned company reference for historical purposes
ALTER TABLE public.cash_collections
DROP CONSTRAINT IF EXISTS cash_collections_company_id_fkey;

-- Re-add WITHOUT a cascading delete so we don't accidentally delete important financial data
-- but also don't block company deletion
ALTER TABLE public.cash_collections
ADD CONSTRAINT cash_collections_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE SET NULL;