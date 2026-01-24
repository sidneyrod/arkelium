import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse duration string to minutes
 * Handles formats: "30m", "1h", "1h30m", "2h", etc.
 */
export function parseDurationToMinutes(duration: string): number {
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  const totalMinutes = hours * 60 + minutes;
  
  // Default to 120 minutes (2h) if parsing fails
  return totalMinutes > 0 ? totalMinutes : 120;
}
