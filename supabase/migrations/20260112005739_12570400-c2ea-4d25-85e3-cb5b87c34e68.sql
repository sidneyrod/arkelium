-- Phase 1: Normalize payment_method values (e-transfer → e_transfer)
UPDATE jobs SET payment_method = 'e_transfer' WHERE payment_method = 'e-transfer';
UPDATE payment_receipts SET payment_method = 'e_transfer' WHERE payment_method = 'e-transfer';
UPDATE invoices SET payment_method = 'e_transfer' WHERE payment_method = 'e-transfer';

-- Phase 3: Add settled_by and settled_at columns to cash_collections
ALTER TABLE cash_collections 
ADD COLUMN IF NOT EXISTS settled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS settled_at timestamptz;