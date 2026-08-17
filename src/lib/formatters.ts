import { normalizeBrazilWhatsapp } from "@/lib/utils";

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

/**
 * Format a phone number for display with proper DDI/DDD separation.
 * Brazilian numbers are normalized to E.164 (55 prefix) first.
 */
export function formatPhoneInternational(value: string): string {
  const digits = normalizeBrazilWhatsapp(value);
  if (!digits) return value || "";

  // Brazilian: 55 + DDD + number
  if (digits.startsWith("55") && digits.length >= 12) {
    const body = digits.slice(2);
    const ddd = body.slice(0, 2);
    const rest = body.slice(2);
    if (rest.length >= 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  // Generic international: +DDI (DDD) number
  if (digits.length >= 13) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  if (digits.length === 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return "+" + digits;
}

export const formatCpfCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  // CNPJ: 00.000.000/0000-00
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

export const unformat = (value: string): string => value.replace(/\D/g, "");
