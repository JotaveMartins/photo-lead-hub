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

/**
 * Normalize text for accent-insensitive search.
 * Lowercases and strips combining diacritics.
 * e.g. "João" → "joao", "Coração" → "coracao"
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normalize a Brazilian WhatsApp number to E.164 digits (no '+').
 * - Strips all non-digits.
 * - If already starts with "55" and has 12-13 digits, returns as-is.
 * - If has 10 or 11 digits (DDD + número), prefixes "55".
 * - Otherwise returns the raw digits (assume already international).
 */
export function normalizeBrazilWhatsapp(raw: string | null | undefined): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return digits;
}

/**
 * Canonical key to compare two WhatsApp numbers regardless of formatting/DDI.
 * - Strips non-digits.
 * - Removes a leading "55" country code if present.
 * - Returns the LAST 11 digits (DDD + 9 + número) or all digits if fewer.
 *
 * Use ONLY for matching two numbers between themselves — never to dial out.
 */
export function whatsappMatchKey(raw: string | null | undefined): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  // Brazil mobile fallback: collapse "DDD + 9 + 8 digits" (11) → "DDD + 8 digits" (10)
  // Landline first digit is 2-5, so a leading 9 after the DDD is always a mobile prefix.
  if (d.length === 11 && d[2] === "9") {
    d = d.slice(0, 2) + d.slice(3);
  }
  return d;
}
