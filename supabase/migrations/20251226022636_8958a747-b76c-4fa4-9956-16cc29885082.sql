
-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Remover VIEW e criar função segura
-- =====================================================

-- Remover a VIEW que tem SECURITY DEFINER implícito
DROP VIEW IF EXISTS public.financial_report_view;

-- Criar função SECURITY INVOKER para buscar dados do relatório
CREATE OR REPLACE FUNCTION public.get_financial_report_data(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  transaction_type public.financial_transaction_type,
  source_type public.financial_source_type,
  amount_gross NUMERIC,
  amount_tax NUMERIC,
  amount_net NUMERIC,
  currency TEXT,
  payment_method TEXT,
  reference_code TEXT,
  accounting_date DATE,
  service_completed_at TIMESTAMPTZ,
  invoice_issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  paid_out_at TIMESTAMPTZ,
  description TEXT,
  notes TEXT,
  status TEXT,
  is_void BOOLEAN,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  cleaner_name TEXT,
  invoice_number TEXT,
  job_type TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    ft.id,
    ft.company_id,
    ft.transaction_type,
    ft.source_type,
    ft.amount_gross,
    ft.amount_tax,
    ft.amount_net,
    ft.currency,
    ft.payment_method,
    ft.reference_code,
    ft.accounting_date,
    ft.service_completed_at,
    ft.invoice_issued_at,
    ft.received_at,
    ft.paid_out_at,
    ft.description,
    ft.notes,
    ft.status,
    ft.is_void,
    ft.created_at,
    c.name AS client_name,
    COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
    i.invoice_number,
    j.job_type
  FROM public.financial_transactions ft
  LEFT JOIN public.clients c ON c.id = ft.client_id
  LEFT JOIN public.profiles p ON p.id = ft.cleaner_id
  LEFT JOIN public.invoices i ON i.id = ft.invoice_id
  LEFT JOIN public.jobs j ON j.id = ft.job_id
  WHERE ft.is_void = false
    AND ft.company_id = public.get_user_company_id()
    AND ft.accounting_date BETWEEN p_start_date AND p_end_date
  ORDER BY ft.accounting_date DESC;
$$;

-- Função para obter resumo financeiro
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_received NUMERIC,
  total_paid_out NUMERIC,
  total_adjustments NUMERIC,
  net_result NUMERIC,
  total_tax_collected NUMERIC,
  transaction_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'received' THEN amount_net ELSE 0 END), 0) AS total_received,
    COALESCE(SUM(CASE WHEN transaction_type = 'paid_out' THEN amount_net ELSE 0 END), 0) AS total_paid_out,
    COALESCE(SUM(CASE WHEN transaction_type = 'adjustment' THEN amount_net ELSE 0 END), 0) AS total_adjustments,
    COALESCE(SUM(CASE 
      WHEN transaction_type = 'received' THEN amount_net 
      WHEN transaction_type = 'paid_out' THEN -amount_net 
      ELSE amount_net 
    END), 0) AS net_result,
    COALESCE(SUM(CASE WHEN transaction_type = 'received' THEN amount_tax ELSE 0 END), 0) AS total_tax_collected,
    COUNT(*) AS transaction_count
  FROM public.financial_transactions
  WHERE is_void = false
    AND company_id = public.get_user_company_id()
    AND accounting_date BETWEEN p_start_date AND p_end_date;
$$;

-- Função para obter resumo do ledger por conta
CREATE OR REPLACE FUNCTION public.get_ledger_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    le.account_code,
    le.account_name,
    COALESCE(SUM(le.debit), 0) AS total_debit,
    COALESCE(SUM(le.credit), 0) AS total_credit,
    COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) AS balance
  FROM public.ledger_entries le
  WHERE le.company_id = public.get_user_company_id()
    AND le.ledger_date BETWEEN p_start_date AND p_end_date
  GROUP BY le.account_code, le.account_name
  ORDER BY le.account_code;
$$;
