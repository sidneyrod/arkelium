/**
 * Financial Ledger Zod Schema
 * 
 * Provides runtime validation for financial_ledger view data.
 * Ensures data integrity before rendering in the UI.
 * 
 * Key features:
 * - Coerces numeric strings to numbers
 * - Handles null values gracefully
 * - Provides detailed validation errors for debugging
 */

import { z } from 'zod';
import type { FinancialLedgerRow, LedgerEntry } from '@/types/financial-ledger';
import { logAuditEntry } from '@/hooks/useAuditLog';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Safe number coercion (handles string, number, null)
// ─────────────────────────────────────────────────────────────────────────────

const coerceNumber = z.union([
  z.number(),
  z.string().transform((val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }),
  z.null().transform(() => 0),
  z.undefined().transform(() => 0),
]).pipe(z.number());

// Optional nullable number (returns number or null)
const optionalNumber = z.union([
  z.number(),
  z.string().transform((val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }),
  z.null(),
  z.undefined(),
]).nullable();

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema for raw financial_ledger rows
// ─────────────────────────────────────────────────────────────────────────────

export const financialLedgerRowSchema = z.object({
  // Required identifiers
  id: z.string(),
  company_id: z.string(),
  
  // Optional identifiers
  client_id: z.string().nullable().optional(),
  cleaner_id: z.string().nullable().optional(),
  job_id: z.string().nullable().optional(),

  // Classification
  source_type: z.string().nullable().optional(),
  event_type: z.string(),
  transaction_type: z.string().nullable().optional(),

  // References
  reference_number: z.string().nullable().optional(),
  service_reference: z.string().nullable().optional(),

  // Monetary values (coerce strings to numbers, handle nulls)
  gross_amount: optionalNumber,
  amount_gross: optionalNumber,
  amount_tax: optionalNumber,
  deductions: optionalNumber,
  net_amount: optionalNumber,
  amount_net: optionalNumber,

  // Payment
  payment_method: z.string().nullable().optional(),

  // Dates (ISO strings)
  transaction_date: z.string().nullable().optional(),
  accounting_date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),

  // Status
  status: z.string(),

  // Denormalized names
  client_name: z.string().nullable().optional(),
  cleaner_name: z.string().nullable().optional(),

  // Notes
  notes: z.string().nullable().optional(),
});

export type ValidatedLedgerRow = z.infer<typeof financialLedgerRowSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Result Type
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerValidationResult {
  valid: FinancialLedgerRow[];
  errors: Array<{ 
    index: number; 
    error: z.ZodError;
    rowId?: string;
  }>;
  hasErrors: boolean;
  errorCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates an array of raw ledger rows from the database
 * 
 * @param data - Array of unknown data from Supabase query
 * @returns Object containing valid rows, errors, and error metadata
 */
export function validateLedgerRows(data: unknown[]): LedgerValidationResult {
  const valid: FinancialLedgerRow[] = [];
  const errors: LedgerValidationResult['errors'] = [];

  data.forEach((row, index) => {
    const result = financialLedgerRowSchema.safeParse(row);
    if (result.success) {
      // Cast validated data to our local type
      valid.push(result.data as unknown as FinancialLedgerRow);
    } else {
      const rowId = typeof row === 'object' && row !== null && 'id' in row 
        ? String((row as Record<string, unknown>).id) 
        : undefined;
      errors.push({ index, error: result.error, rowId });
    }
  });

  return { 
    valid, 
    errors, 
    hasErrors: errors.length > 0,
    errorCount: errors.length 
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Function: Raw Row -> UI Entry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe number extraction with fallback chain
 * Normalization rules (documented):
 * - grossAmount = gross_amount ?? amount_gross ?? 0
 * - netAmount = net_amount ?? amount_net ?? 0
 * - deductions = deductions ?? amount_tax ?? 0
 */
function safeNumber(primary: unknown, fallback: unknown): number {
  const tryParse = (val: unknown): number | null => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  
  return tryParse(primary) ?? tryParse(fallback) ?? 0;
}

/**
 * Maps validated raw rows to UI-friendly LedgerEntry format
 * 
 * Normalization rules (fixed and documented):
 * - grossAmount = gross_amount ?? amount_gross ?? 0
 * - netAmount = net_amount ?? amount_net ?? 0  
 * - deductions = deductions ?? amount_tax ?? 0
 * 
 * TODO: Consider updating the financial_ledger view to use consistent
 * column names (gross_amount, net_amount, deductions) to eliminate
 * the need for fallback logic here.
 */
export function mapToLedgerEntries(rows: FinancialLedgerRow[]): LedgerEntry[] {
  return rows.map((row): LedgerEntry => ({
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id ?? null,
    cleanerId: row.cleaner_id ?? null,
    jobId: row.job_id ?? null,
    
    // Date: prefer transaction_date, fallback to accounting_date, then empty
    transactionDate: row.transaction_date || row.accounting_date || '',
    
    eventType: row.event_type,
    clientName: row.client_name ?? null,
    cleanerName: row.cleaner_name ?? null,
    serviceReference: row.service_reference ?? null,
    referenceNumber: row.reference_number ?? null,
    paymentMethod: row.payment_method ?? null,
    
    // Monetary normalization (documented rules)
    grossAmount: safeNumber(row.gross_amount, row.amount_gross),
    deductions: safeNumber(row.deductions, row.amount_tax),
    netAmount: safeNumber(row.net_amount, row.amount_net),
    
    status: row.status,
    createdAt: row.created_at || '',
    notes: row.notes ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Logging Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs validation errors to console (source=system)
 * Does not include sensitive data in the log
 * 
 * NOTE: Using console.warn instead of audit log to avoid circular deps
 * and because 'system_event' is not a valid AuditAction type.
 * For enterprise, consider adding 'ledger_validation_error' to AuditAction.
 */
export function logLedgerValidationErrors(
  errors: LedgerValidationResult['errors'],
  companyId: string
): void {
  if (errors.length === 0) return;

  // Log to console with structured data (non-sensitive)
  console.warn('[Ledger Validation]', {
    companyId,
    errorCount: errors.length,
    affectedRows: errors.slice(0, 10).map(e => ({
      index: e.index,
      rowId: e.rowId || 'unknown',
      issues: e.error.issues.map(i => i.path.join('.') + ': ' + i.message).slice(0, 5)
    }))
  });

  // TODO: Add 'ledger_validation_error' to AuditAction type and log to activity_logs
  // await logAuditEntry({ action: 'ledger_validation_error', ... }, undefined, companyId);
}
