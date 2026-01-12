-- Fix existing cash receipts that don't have sent_at
-- These should be considered "confirmed" since cash payment was received at generation time
UPDATE payment_receipts 
SET sent_at = created_at 
WHERE payment_method = 'cash' 
  AND sent_at IS NULL;