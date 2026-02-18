import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date to avoid UTC timezone shift.
 * e.g. "2026-02-18" → Feb 18 local (not UTC midnight which shows as Feb 17 in Brazil)
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
