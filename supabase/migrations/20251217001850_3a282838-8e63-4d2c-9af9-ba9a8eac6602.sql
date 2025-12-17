-- Add columns for cash handling workflow
ALTER TABLE public.cleaner_payments 
ADD COLUMN IF NOT EXISTS cash_handling_choice text CHECK (cash_handling_choice IN ('keep_cash', 'hand_to_admin')),
ADD COLUMN IF NOT EXISTS admin_approval_status text DEFAULT 'pending' CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS admin_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS admin_rejection_reason text,
ADD COLUMN IF NOT EXISTS deduct_from_payroll boolean DEFAULT false;

-- Create index for faster queries on pending approvals
CREATE INDEX IF NOT EXISTS idx_cleaner_payments_approval_status ON public.cleaner_payments(admin_approval_status, company_id);

-- Add comment for documentation
COMMENT ON COLUMN public.cleaner_payments.cash_handling_choice IS 'Cleaner choice: keep_cash or hand_to_admin';
COMMENT ON COLUMN public.cleaner_payments.admin_approval_status IS 'Admin approval status for cash payments';
COMMENT ON COLUMN public.cleaner_payments.deduct_from_payroll IS 'Whether this cash should be deducted from payroll';