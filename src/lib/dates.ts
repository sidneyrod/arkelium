/**
 * Safe date utilities to prevent timezone shift issues with date-only strings.
 * 
 * Problem: When parsing "YYYY-MM-DD" with `new Date("2025-12-15")`, JS interprets it as UTC midnight.
 * In timezones with negative offset (e.g., America/Toronto UTC-5), this displays as Dec 14.
 * 
 * Solution: Parse date-only strings at noon local time to prevent any date shift.
 */

import { format } from 'date-fns';

/**
 * Checks if a string is a date-only format (YYYY-MM-DD).
 */
function isDateOnlyString(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

/**
 * Safely converts a date input to a local Date object without timezone shift.
 * 
 * - For date-only strings (YYYY-MM-DD): Creates Date at noon local time to prevent shift.
 * - For ISO timestamps or Date objects: Returns as-is.
 * 
 * @param input - Date string or Date object
 * @returns Date object safe for local display
 */
export function toSafeLocalDate(input: string | Date | null | undefined): Date {
  if (!input) {
    return new Date();
  }
  
  if (input instanceof Date) {
    return input;
  }
  
  // If it's a date-only string (YYYY-MM-DD), parse at noon local time
  if (isDateOnlyString(input)) {
    const [year, month, day] = input.split('-').map(Number);
    // Noon local time prevents any date shift regardless of timezone
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  
  // For full ISO timestamps, use standard Date parsing
  return new Date(input);
}

/**
 * Safely formats a date input using a format pattern.
 * Handles date-only strings to prevent timezone shift.
 * 
 * @param input - Date string (YYYY-MM-DD or ISO), Date object, or null
 * @param pattern - date-fns format pattern (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatSafeDate(
  input: string | Date | null | undefined,
  pattern: string = 'MMM d, yyyy'
): string {
  if (!input) {
    return '';
  }
  
  const safeDate = toSafeLocalDate(input);
  return format(safeDate, pattern);
}

/**
 * Safely formats just the date portion without timezone issues.
 * Shorthand for formatSafeDate(input, 'MMM d, yyyy').
 */
export function formatDateOnly(input: string | Date | null | undefined): string {
  return formatSafeDate(input, 'MMM d, yyyy');
}

/**
 * Safely formats date and time for timestamps (ISO strings).
 */
export function formatDateTime(
  input: string | Date | null | undefined,
  pattern: string = 'MMM d, yyyy HH:mm'
): string {
  if (!input) {
    return '';
  }
  
  // For full timestamps, use standard parsing
  const date = input instanceof Date ? input : new Date(input);
  return format(date, pattern);
}

/**
 * Compares if two date inputs represent the same calendar day.
 * Safe for date-only strings.
 */
export function isSameCalendarDay(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): boolean {
  if (!date1 || !date2) return false;
  
  const d1 = toSafeLocalDate(date1);
  const d2 = toSafeLocalDate(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Converts a Date object to a YYYY-MM-DD string for database storage.
 * Safe for date-only fields.
 */
export function toDateOnlyString(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
