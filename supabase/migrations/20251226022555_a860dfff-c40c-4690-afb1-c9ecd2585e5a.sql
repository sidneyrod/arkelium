
-- =====================================================
-- PARTE 1: ENUMS PARA TRANSAÇÕES FINANCEIRAS
-- =====================================================

-- Tipo de transação financeira
CREATE TYPE public.financial_transaction_type AS ENUM (
  'received',    -- Receita efetivamente recebida
  'paid_out',    -- Pagamento/saída de caixa
  'adjustment'   -- Ajuste contábil (sem movimento de caixa)
);

-- Origem da transação
CREATE TYPE public.financial_source_type AS ENUM (
  'service',     -- Serviço concluído com pagamento
  'invoice',     -- Fatura paga
  'payroll',     -- Folha de pagamento
  'expense',     -- Despesa operacional
  'refund',      -- Reembolso
  'manual'       -- Entrada manual
);

-- Tipo de conta contábil
CREATE TYPE public.account_type AS ENUM (
  'asset',       -- Ativo
  'liability',   -- Passivo
  'equity',      -- Patrimônio
  'revenue',     -- Receita
  'expense'      -- Despesa
);

-- =====================================================
-- PARTE 2: CONFIGURAÇÃO CONTÁBIL POR EMPRESA
-- =====================================================

ALTER TABLE public.company_estimate_config 
ADD COLUMN IF NOT EXISTS accounting_method TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE public.company_estimate_config 
ADD COLUMN IF NOT EXISTS accounting_date_field TEXT NOT NULL DEFAULT 'received_at';

-- Constraint para valores válidos
ALTER TABLE public.company_estimate_config 
ADD CONSTRAINT valid_accounting_method 
CHECK (accounting_method IN ('cash', 'accrual'));

ALTER TABLE public.company_estimate_config 
ADD CONSTRAINT valid_accounting_date_field 
CHECK (accounting_date_field IN ('received_at', 'service_completed_at', 'invoice_issued_at'));

-- =====================================================
-- PARTE 3: PLANO DE CONTAS (CHART OF ACCOUNTS)
-- =====================================================

CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type public.account_type NOT NULL,
  parent_code TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, account_code)
);

-- RLS para chart_of_accounts
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chart of accounts"
ON public.chart_of_accounts FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage chart of accounts"
ON public.chart_of_accounts FOR ALL
USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admins can insert chart of accounts"
ON public.chart_of_accounts FOR INSERT
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'));

-- Trigger para updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PARTE 4: TABELA CENTRAL DE TRANSAÇÕES FINANCEIRAS
-- =====================================================

CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Classificação obrigatória
  transaction_type public.financial_transaction_type NOT NULL,
  source_type public.financial_source_type NOT NULL,
  
  -- Referências opcionais às tabelas de origem
  invoice_id UUID REFERENCES public.invoices(id),
  job_id UUID REFERENCES public.jobs(id),
  receipt_id UUID REFERENCES public.payment_receipts(id),
  payroll_period_id UUID REFERENCES public.payroll_periods(id),
  client_id UUID REFERENCES public.clients(id),
  cleaner_id UUID REFERENCES public.profiles(id),
  
  -- Valores financeiros
  amount_gross NUMERIC NOT NULL DEFAULT 0,
  amount_tax NUMERIC NOT NULL DEFAULT 0,
  amount_net NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  
  -- Informações de pagamento
  payment_method TEXT,
  reference_code TEXT,
  
  -- DATAS CONTÁBEIS (CRÍTICO PARA AUDITORIA)
  service_completed_at TIMESTAMPTZ,      -- Data do serviço concluído
  invoice_issued_at TIMESTAMPTZ,          -- Data de emissão da fatura
  received_at TIMESTAMPTZ,                -- Data do dinheiro no caixa
  paid_out_at TIMESTAMPTZ,                -- Data do pagamento (para PAID_OUT)
  accounting_date DATE NOT NULL,          -- Data usada no ledger e relatórios
  
  -- Descrição e notas
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed',
  
  -- Auditoria e imutabilidade
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Controle de estorno (imutabilidade)
  is_void BOOLEAN NOT NULL DEFAULT false,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id),
  void_reason TEXT,
  reversal_of UUID REFERENCES public.financial_transactions(id),
  
  -- Constraints de validação
  CONSTRAINT valid_amount_signs CHECK (
    (transaction_type = 'received' AND amount_net >= 0) OR
    (transaction_type = 'paid_out' AND amount_net >= 0) OR
    (transaction_type = 'adjustment')
  ),
  CONSTRAINT void_requires_reason CHECK (
    (is_void = false) OR (is_void = true AND void_reason IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_fin_trans_company_date ON public.financial_transactions(company_id, accounting_date);
CREATE INDEX idx_fin_trans_type ON public.financial_transactions(company_id, transaction_type);
CREATE INDEX idx_fin_trans_source ON public.financial_transactions(company_id, source_type);
CREATE INDEX idx_fin_trans_invoice ON public.financial_transactions(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_fin_trans_job ON public.financial_transactions(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_fin_trans_client ON public.financial_transactions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_fin_trans_cleaner ON public.financial_transactions(cleaner_id) WHERE cleaner_id IS NOT NULL;
CREATE INDEX idx_fin_trans_not_void ON public.financial_transactions(company_id, accounting_date) WHERE is_void = false;

-- RLS para financial_transactions
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can view financial transactions"
ON public.financial_transactions FOR SELECT
USING (company_id = get_user_company_id() AND is_admin_or_manager());

CREATE POLICY "Admin can insert financial transactions"
ON public.financial_transactions FOR INSERT
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'));

CREATE POLICY "Admin can update financial transactions"
ON public.financial_transactions FOR UPDATE
USING (company_id = get_user_company_id() AND has_role('admin'));

-- Trigger para updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PARTE 5: LEDGER CONTÁBIL IMUTÁVEL
-- =====================================================

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Referência obrigatória à transação
  financial_transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id),
  
  -- Data do lançamento contábil
  ledger_date DATE NOT NULL,
  
  -- Conta contábil
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  
  -- Double-entry: débito ou crédito
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  
  -- Descrição do lançamento
  description TEXT,
  
  -- Auditoria (imutável)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: débito XOR crédito
  CONSTRAINT ledger_single_side CHECK (
    (debit > 0 AND credit = 0) OR 
    (credit > 0 AND debit = 0) OR
    (debit = 0 AND credit = 0)
  )
);

-- Índices para ledger
CREATE INDEX idx_ledger_company_date ON public.ledger_entries(company_id, ledger_date);
CREATE INDEX idx_ledger_transaction ON public.ledger_entries(financial_transaction_id);
CREATE INDEX idx_ledger_account ON public.ledger_entries(company_id, account_code);
CREATE INDEX idx_ledger_date_range ON public.ledger_entries(company_id, ledger_date DESC);

-- RLS para ledger_entries (somente leitura para todos, insert apenas admin)
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can view ledger entries"
ON public.ledger_entries FOR SELECT
USING (company_id = get_user_company_id() AND is_admin_or_manager());

CREATE POLICY "Admin can insert ledger entries"
ON public.ledger_entries FOR INSERT
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'));

-- NOTA: Sem política de UPDATE ou DELETE - ledger é imutável

-- =====================================================
-- PARTE 6: FUNÇÃO PARA CRIAR CONTAS PADRÃO
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assets (1000s)
  INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, display_order)
  VALUES 
    (p_company_id, '1000', 'Assets', 'asset', 100),
    (p_company_id, '1010', 'Cash/Bank', 'asset', 110),
    (p_company_id, '1020', 'Accounts Receivable', 'asset', 120)
  ON CONFLICT (company_id, account_code) DO NOTHING;
  
  -- Liabilities (2000s)
  INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, display_order)
  VALUES 
    (p_company_id, '2000', 'Liabilities', 'liability', 200),
    (p_company_id, '2010', 'HST/GST Payable', 'liability', 210),
    (p_company_id, '2020', 'Accounts Payable', 'liability', 220)
  ON CONFLICT (company_id, account_code) DO NOTHING;
  
  -- Equity (3000s)
  INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, display_order)
  VALUES 
    (p_company_id, '3000', 'Equity', 'equity', 300),
    (p_company_id, '3010', 'Retained Earnings', 'equity', 310)
  ON CONFLICT (company_id, account_code) DO NOTHING;
  
  -- Revenue (4000s)
  INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, display_order)
  VALUES 
    (p_company_id, '4000', 'Revenue', 'revenue', 400),
    (p_company_id, '4010', 'Service Revenue', 'revenue', 410),
    (p_company_id, '4020', 'Other Revenue', 'revenue', 420)
  ON CONFLICT (company_id, account_code) DO NOTHING;
  
  -- Expenses (5000s)
  INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, display_order)
  VALUES 
    (p_company_id, '5000', 'Expenses', 'expense', 500),
    (p_company_id, '5010', 'Payroll Expense', 'expense', 510),
    (p_company_id, '5020', 'Operating Expenses', 'expense', 520),
    (p_company_id, '5030', 'Supplies Expense', 'expense', 530)
  ON CONFLICT (company_id, account_code) DO NOTHING;
END;
$$;

-- =====================================================
-- PARTE 7: VIEW CONSOLIDADA PARA RELATÓRIOS
-- =====================================================

CREATE OR REPLACE VIEW public.financial_report_view AS
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
WHERE ft.is_void = false;
