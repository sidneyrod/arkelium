-- Update the CHECK constraint to include approved and disputed statuses
ALTER TABLE public.cash_collections
  DROP CONSTRAINT IF EXISTS cash_collections_compensation_status_check;

ALTER TABLE public.cash_collections
  ADD CONSTRAINT cash_collections_compensation_status_check
  CHECK (
    compensation_status = ANY (
      ARRAY[
        'pending'::text,
        'approved'::text,
        'disputed'::text,
        'settled'::text,
        'not_applicable'::text
      ]
    )
  );