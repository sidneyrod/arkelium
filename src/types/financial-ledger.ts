/**
 * Financial Ledger Types - Local Type Definitions
 * 
 * These types are maintained manually to ensure stability
 * when Supabase auto-generated types are delayed after view changes.
 * 
 * MUST match the columns returned by: public.financial_ledger view
 */

// ─────────────────────────────────────────────────────────────────────────────
// Known enum-like values (extensible with string fallback for forward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/** Event types that appear in the finalized ledger */
export type LedgerEventType = 
  | 'invoice' 
  | 'payment' 
  | 'payroll' 
  | 'adjustment'
  | 'refund';

/** Standardized payment methods across the platform */
export type LedgerPaymentMethod = 
  | 'cash' 
  | 'e_transfer' 
  | 'e-transfer'  // legacy format
  | 'credit_card' 
  | 'debit_card' 
  | 'cheque' 
  | 'bank_transfer'
  | 'no_charge'
  | 'pending'
  | 'kept_by_cleaner'
  | 'unknown';

/** Statuses that appear in finalized ledger (only paid/approved/settled) */
export type LedgerStatus = 
  | 'paid' 
  | 'approved' 
  | 'settled';

// ─────────────────────────────────────────────────────────────────────────────
// Raw Database Row Type (matches view columns exactly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw row from financial_ledger view
 * Column names match database snake_case convention
 * 
 * NOTE: The view currently returns these column names.
 * If the view is updated, this type MUST be updated to match.
 */
export interface FinancialLedgerRow {
  // Primary identifiers
  id: string;
  company_id: string;
  client_id: string | null;
  cleaner_id: string | null;
  job_id: string | null;

  // Classification
  source_type: string | null;
  event_type: LedgerEventType | string;
  transaction_type: string | null;

  // Reference and description
  reference_number: string | null;
  service_reference: string | null;

  // Monetary values
  // TODO: Normalize view to use single naming convention (gross_amount, net_amount, deductions)
  // Currently the view may return either format depending on source
  gross_amount: number | string | null;
  amount_gross: number | string | null;  // legacy column name
  amount_tax: number | string | null;
  deductions: number | string | null;
  net_amount: number | string | null;
  amount_net: number | string | null;    // legacy column name

  // Payment details
  payment_method: LedgerPaymentMethod | string | null;

  // Dates
  transaction_date: string | null;
  accounting_date: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Status
  status: LedgerStatus | string;

  // Related entity names (denormalized for display)
  client_name: string | null;
  cleaner_name: string | null;

  // Additional info
  notes: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI-Friendly Type (camelCase, normalized values)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalized ledger entry for UI consumption
 * - Uses camelCase property names
 * - Numeric values are guaranteed numbers (not strings)
 * - Dates are ISO strings
 */
export interface LedgerEntry {
  id: string;
  companyId: string;
  clientId: string | null;
  cleanerId: string | null;
  jobId: string | null;
  transactionDate: string;
  eventType: LedgerEventType | string;
  clientName: string | null;
  cleanerName: string | null;
  serviceReference: string | null;
  referenceNumber: string | null;
  paymentMethod: LedgerPaymentMethod | string | null;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: LedgerStatus | string;
  createdAt: string;
  notes: string | null;
}
