import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';

// Canadian timezone options with IANA identifiers
export const CANADIAN_TIMEZONES = [
  { value: 'America/St_Johns', label: 'Newfoundland (NST/NDT)', offset: 'UTC-3:30' },
  { value: 'America/Halifax', label: 'Atlantic (AST/ADT)', offset: 'UTC-4' },
  { value: 'America/Toronto', label: 'Eastern (EST/EDT)', offset: 'UTC-5' },
  { value: 'America/Winnipeg', label: 'Central (CST/CDT)', offset: 'UTC-6' },
  { value: 'America/Edmonton', label: 'Mountain (MST/MDT)', offset: 'UTC-7' },
  { value: 'America/Vancouver', label: 'Pacific (PST/PDT)', offset: 'UTC-8' },
] as const;

export type CanadianTimezone = typeof CANADIAN_TIMEZONES[number]['value'];

export function useTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState<string>('America/Toronto');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyTimezone = async () => {
      if (!user?.profile?.company_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('timezone')
          .eq('id', user.profile.company_id)
          .maybeSingle();

        if (data?.timezone) {
          setTimezone(data.timezone);
        }
      } catch (error) {
        console.error('Error fetching company timezone:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyTimezone();
  }, [user?.profile?.company_id]);

  /**
   * Convert a UTC date to the company's local timezone for display
   */
  const toLocalTime = (utcDate: Date | string): Date => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return toZonedTime(date, timezone);
  };

  /**
   * Convert a local date (in company timezone) to UTC for storage
   */
  const toUTC = (localDate: Date): Date => {
    return fromZonedTime(localDate, timezone);
  };

  /**
   * Format a UTC date in the company's local timezone
   */
  const formatLocal = (utcDate: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm'): string => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return formatInTimeZone(date, timezone, formatStr);
  };

  /**
   * Format date only (no time conversion issues)
   */
  const formatLocalDate = (utcDate: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return formatInTimeZone(date, timezone, formatStr);
  };

  /**
   * Format time only in local timezone
   */
  const formatLocalTime = (utcDate: Date | string, formatStr: string = 'HH:mm'): string => {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return formatInTimeZone(date, timezone, formatStr);
  };

  /**
   * Get current date/time in company timezone
   */
  const now = (): Date => {
    return toZonedTime(new Date(), timezone);
  };

  /**
   * Get today's date string in company timezone (YYYY-MM-DD)
   */
  const today = (): string => {
    return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
  };

  /**
   * Parse a local date string and create a Date object at noon to avoid timezone issues
   * This is the recommended way to handle date-only inputs
   */
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at noon in local timezone to avoid off-by-one errors
    const localDate = new Date(year, month - 1, day, 12, 0, 0);
    return localDate;
  };

  return {
    timezone,
    isLoading,
    toLocalTime,
    toUTC,
    formatLocal,
    formatLocalDate,
    formatLocalTime,
    now,
    today,
    parseLocalDate,
  };
}

export default useTimezone;
