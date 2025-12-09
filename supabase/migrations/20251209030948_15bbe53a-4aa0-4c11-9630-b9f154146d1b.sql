-- Add notification tracking for payroll periods
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS notification_sent_at timestamp with time zone;

-- Add company_id index for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_status ON public.payroll_periods(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period ON public.payroll_entries(period_id);

-- Create function to calculate next pay period dates based on frequency
CREATE OR REPLACE FUNCTION public.get_next_payroll_period(
  p_frequency text,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(start_date date, end_date date)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Week starts on Monday
      start_date := p_reference_date - (EXTRACT(DOW FROM p_reference_date)::int - 1);
      end_date := start_date + 6;
    WHEN 'biweekly' THEN
      -- Two week period
      start_date := p_reference_date - (EXTRACT(DOW FROM p_reference_date)::int - 1);
      end_date := start_date + 13;
    WHEN 'semimonthly' THEN
      -- 1-15 or 16-end of month
      IF EXTRACT(DAY FROM p_reference_date) <= 15 THEN
        start_date := date_trunc('month', p_reference_date)::date;
        end_date := date_trunc('month', p_reference_date)::date + 14;
      ELSE
        start_date := date_trunc('month', p_reference_date)::date + 15;
        end_date := (date_trunc('month', p_reference_date) + interval '1 month' - interval '1 day')::date;
      END IF;
    WHEN 'monthly' THEN
      start_date := date_trunc('month', p_reference_date)::date;
      end_date := (date_trunc('month', p_reference_date) + interval '1 month' - interval '1 day')::date;
    ELSE
      -- Default to biweekly
      start_date := p_reference_date - (EXTRACT(DOW FROM p_reference_date)::int - 1);
      end_date := start_date + 13;
  END CASE;
  
  RETURN NEXT;
END;
$$;