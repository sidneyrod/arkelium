/**
 * Type-Safe Supabase Query Helpers
 * 
 * Simple query functions that work with local types instead of relying
 * on auto-generated Supabase types (which may be delayed after view changes).
 * 
 * Uses Zod validation for type safety - no "as any" casts.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FinancialLedgerRow } from '@/types/financial-ledger';
import { 
  validateLedgerRows, 
  mapToLedgerEntries,
  logLedgerValidationErrors,
  type LedgerValidationResult 
} from '@/schemas/financial-ledger.schema';
import type { LedgerEntry } from '@/types/financial-ledger';

// ─────────────────────────────────────────────────────────────────────────────
// Query Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerQueryResult {
  data: LedgerEntry[];
  count: number;
  validation: LedgerValidationResult;
  error: Error | null;
}

export interface LedgerDistinctResult<T> {
  values: T[];
  error: Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Options Query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches distinct values for a specific column from financial_ledger
 * Used for populating filter dropdowns
 * 
 * @param column - Column name to get distinct values from
 * @param companyId - Company ID for filtering
 * @returns Array of unique non-null values
 */
export async function queryLedgerDistinctValues(
  column: keyof FinancialLedgerRow,
  companyId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('financial_ledger')
    .select(column)
    .eq('company_id', companyId)
    .not(column, 'is', null);

  if (error || !data) {
    console.warn(`Failed to fetch distinct ${column} values:`, error);
    return [];
  }

  // Extract unique values from the response
  const values = data.map((row: Record<string, unknown>) => row[column]);
  const unique = [...new Set(values)].filter(Boolean) as string[];
  return unique.sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Ledger Query
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerQueryParams {
  companyId: string;
  startDate: string;
  endDate: string;
  eventTypeFilter?: string;
  statusFilter?: string;
  paymentMethodFilter?: string;
  clientFilter?: string;
  cleanerFilter?: string;
  referenceFilter?: string;
  grossFilter?: string;
  deductFilter?: string;
  netFilter?: string;
  search?: string;
  from: number;
  to: number;
}

/**
 * Fetches and validates ledger entries with all filters applied
 * 
 * @param params - Query parameters including filters and pagination
 * @returns Validated, mapped ledger entries with pagination info
 */
export async function queryFinancialLedger(
  params: LedgerQueryParams
): Promise<LedgerQueryResult> {
  const {
    companyId,
    startDate,
    endDate,
    eventTypeFilter,
    statusFilter,
    paymentMethodFilter,
    clientFilter,
    cleanerFilter,
    referenceFilter,
    grossFilter,
    deductFilter,
    netFilter,
    search,
    from,
    to
  } = params;

  // Build query - financial_ledger is a view recognized by Supabase types
  let query = supabase
    .from('financial_ledger')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  // Apply filters
  if (eventTypeFilter && eventTypeFilter !== 'all') {
    query = query.eq('event_type', eventTypeFilter);
  }
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (paymentMethodFilter && paymentMethodFilter !== 'all') {
    query = query.eq('payment_method', paymentMethodFilter);
  }
  if (clientFilter && clientFilter !== 'all') {
    query = query.eq('client_id', clientFilter);
  }
  if (cleanerFilter && cleanerFilter !== 'all') {
    query = query.eq('cleaner_id', cleanerFilter);
  }
  if (search) {
    query = query.or(`client_name.ilike.%${search}%,cleaner_name.ilike.%${search}%,reference_number.ilike.%${search}%`);
  }

  // Reference filter (by prefix)
  if (referenceFilter && referenceFilter !== 'all') {
    query = query.ilike('reference_number', `${referenceFilter}%`);
  }

  // Amount range filters - inline to avoid complex generic types
  if (grossFilter && grossFilter !== 'all') {
    switch (grossFilter) {
      case '0-50':
        query = query.gte('gross_amount', 0).lte('gross_amount', 50);
        break;
      case '50-100':
        query = query.gt('gross_amount', 50).lte('gross_amount', 100);
        break;
      case '100-250':
        query = query.gt('gross_amount', 100).lte('gross_amount', 250);
        break;
      case '250-500':
        query = query.gt('gross_amount', 250).lte('gross_amount', 500);
        break;
      case '500+':
        query = query.gt('gross_amount', 500);
        break;
    }
  }

  if (deductFilter && deductFilter !== 'all') {
    switch (deductFilter) {
      case '0':
        query = query.eq('deductions', 0);
        break;
      case '0-25':
        query = query.gt('deductions', 0).lte('deductions', 25);
        break;
      case '25-50':
        query = query.gt('deductions', 25).lte('deductions', 50);
        break;
      case '50+':
        query = query.gt('deductions', 50);
        break;
    }
  }

  if (netFilter && netFilter !== 'all') {
    switch (netFilter) {
      case '0-50':
        query = query.gte('net_amount', 0).lte('net_amount', 50);
        break;
      case '50-100':
        query = query.gt('net_amount', 50).lte('net_amount', 100);
        break;
      case '100-250':
        query = query.gt('net_amount', 100).lte('net_amount', 250);
        break;
      case '250-500':
        query = query.gt('net_amount', 250).lte('net_amount', 500);
        break;
      case '500+':
        query = query.gt('net_amount', 500);
        break;
    }
  }

  // Order and paginate
  query = query
    .order('transaction_date', { ascending: false })
    .range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error('Ledger query error:', error);
    return {
      data: [],
      count: 0,
      validation: { valid: [], errors: [], hasErrors: false, errorCount: 0, affectedRowIds: [] },
      error: new Error(error.message)
    };
  }

  // Validate with Zod
  const validation = validateLedgerRows(data || []);

  // Log validation errors (async, non-blocking)
  if (validation.hasErrors) {
    // Fire and forget - don't block the response
    logLedgerValidationErrors(validation.errors, companyId).catch(() => {});
  }

  // Map to UI format
  const mappedEntries = mapToLedgerEntries(validation.valid);

  return {
    data: mappedEntries,
    count: count || 0,
    validation,
    error: null
  };
}
