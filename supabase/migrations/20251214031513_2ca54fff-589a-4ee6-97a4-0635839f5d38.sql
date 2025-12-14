
-- Create enum for financial event types
CREATE TYPE public.financial_event_type AS ENUM (
  'invoice',
  'payment',
  'visit',
  'payroll',
  'refund',
  'adjustment'
);

-- Create enum for payment methods
CREATE TYPE public.payment_method_type AS ENUM (
  'cash',
  'e_transfer',
  'cheque',
  'credit_card',
  'bank_transfer',
  'no_charge'
);

-- Create table for manual financial adjustments and refunds
CREATE TABLE public.financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  cleaner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  event_type financial_event_type NOT NULL,
  description TEXT NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method_type,
  reference_number TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage financial adjustments"
ON public.financial_adjustments
FOR ALL
USING (company_id = get_user_company_id() AND has_role('admin'::app_role));

CREATE POLICY "Admin can insert financial adjustments"
ON public.financial_adjustments
FOR INSERT
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

CREATE POLICY "Users can view financial adjustments"
ON public.financial_adjustments
FOR SELECT
USING (company_id = get_user_company_id() AND is_admin_or_manager());

-- Create indexes
CREATE INDEX idx_financial_adjustments_company ON public.financial_adjustments(company_id);
CREATE INDEX idx_financial_adjustments_date ON public.financial_adjustments(transaction_date);
CREATE INDEX idx_financial_adjustments_type ON public.financial_adjustments(event_type);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_adjustments_updated_at
BEFORE UPDATE ON public.financial_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create comprehensive financial ledger view
CREATE OR REPLACE VIEW public.financial_ledger AS
-- Invoices
SELECT 
  i.id,
  i.company_id,
  i.client_id,
  i.cleaner_id,
  i.job_id,
  COALESCE(i.service_date, i.created_at::date) as transaction_date,
  'invoice'::text as event_type,
  c.name as client_name,
  CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
  i.job_id::text as service_reference,
  i.invoice_number as reference_number,
  CASE 
    WHEN j.payment_method IS NOT NULL THEN j.payment_method
    ELSE 'pending'
  END as payment_method,
  i.subtotal as gross_amount,
  COALESCE(i.tax_amount, 0) as deductions,
  i.total as net_amount,
  i.status,
  i.created_at,
  i.notes
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id
LEFT JOIN public.profiles p ON i.cleaner_id = p.id
LEFT JOIN public.jobs j ON i.job_id = j.id

UNION ALL

-- Completed Jobs with Payments (not yet invoiced)
SELECT 
  j.id,
  j.company_id,
  j.client_id,
  j.cleaner_id,
  j.id as job_id,
  j.scheduled_date as transaction_date,
  'payment'::text as event_type,
  c.name as client_name,
  CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
  j.id::text as service_reference,
  j.payment_reference as reference_number,
  COALESCE(j.payment_method, 'pending') as payment_method,
  COALESCE(j.payment_amount, 0) as gross_amount,
  0 as deductions,
  COALESCE(j.payment_amount, 0) as net_amount,
  CASE 
    WHEN j.payment_date IS NOT NULL THEN 'paid'
    WHEN j.status = 'completed' THEN 'pending'
    ELSE j.status
  END as status,
  j.created_at,
  j.notes
FROM public.jobs j
LEFT JOIN public.clients c ON j.client_id = c.id
LEFT JOIN public.profiles p ON j.cleaner_id = p.id
WHERE j.status = 'completed'
AND j.payment_amount IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.job_id = j.id)

UNION ALL

-- Visits (non-billable)
SELECT 
  j.id,
  j.company_id,
  j.client_id,
  j.cleaner_id,
  j.id as job_id,
  j.scheduled_date as transaction_date,
  'visit'::text as event_type,
  c.name as client_name,
  CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
  j.id::text as service_reference,
  NULL as reference_number,
  'no_charge' as payment_method,
  0 as gross_amount,
  0 as deductions,
  0 as net_amount,
  j.status,
  j.created_at,
  j.notes
FROM public.jobs j
LEFT JOIN public.clients c ON j.client_id = c.id
LEFT JOIN public.profiles p ON j.cleaner_id = p.id
WHERE j.job_type = 'visit'

UNION ALL

-- Payroll Entries
SELECT 
  pe.id,
  pe.company_id,
  NULL as client_id,
  pe.employee_id as cleaner_id,
  NULL as job_id,
  pp.end_date as transaction_date,
  'payroll'::text as event_type,
  NULL as client_name,
  CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
  pp.period_name as service_reference,
  pp.id::text as reference_number,
  'bank_transfer' as payment_method,
  COALESCE(pe.gross_pay, 0) as gross_amount,
  COALESCE(pe.cpp_deduction, 0) + COALESCE(pe.ei_deduction, 0) + COALESCE(pe.tax_deduction, 0) + COALESCE(pe.other_deductions, 0) as deductions,
  COALESCE(pe.net_pay, 0) as net_amount,
  pp.status,
  pe.created_at,
  pe.notes
FROM public.payroll_entries pe
JOIN public.payroll_periods pp ON pe.period_id = pp.id
LEFT JOIN public.profiles p ON pe.employee_id = p.id

UNION ALL

-- Financial Adjustments (refunds, manual entries)
SELECT 
  fa.id,
  fa.company_id,
  fa.client_id,
  fa.cleaner_id,
  fa.job_id,
  fa.transaction_date,
  fa.event_type::text,
  c.name as client_name,
  CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
  COALESCE(fa.job_id::text, 'N/A') as service_reference,
  fa.reference_number,
  COALESCE(fa.payment_method::text, 'N/A') as payment_method,
  fa.gross_amount,
  fa.deductions,
  fa.net_amount,
  fa.status,
  fa.created_at,
  fa.description as notes
FROM public.financial_adjustments fa
LEFT JOIN public.clients c ON fa.client_id = c.id
LEFT JOIN public.profiles p ON fa.cleaner_id = p.id;
