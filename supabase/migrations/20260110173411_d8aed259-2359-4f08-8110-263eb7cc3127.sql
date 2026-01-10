-- Allow deleting companies without modifying immutable audit logs
-- The FK causes deletes to fail (NO ACTION) and SET NULL is blocked by audit immutability trigger.
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_company_id_fkey;