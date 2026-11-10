export const WHATSAPP_BIO_MESSAGE_PRESETS = [
  { label: "Instagram", message: "Olá, vim pelo Instagram, gostaria de mais informações" },
  { label: "Google Meu Negócio", message: "Olá, vim pelo Google, gostaria de mais informações" },
] as const;
export const DEFAULT_WHATSAPP_BIO_MESSAGE = WHATSAPP_BIO_MESSAGE_PRESETS[0].message;
export const CRM_BIO_LINK_ORIGIN = "https://crm.avanzodigital.com.br";

// Local Brazilian numbers receive DDI 55. Explicit international numbers keep their DDI.
export function normalizeBioPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+") && (digits.length === 10 || digits.length === 11)) return `55${digits}`;
  return digits;
}
export function validBioPhone(value: string): boolean {
  return /^[1-9]\d{7,14}$/.test(value);
}
export function validBioSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(value);
}
export function whatsappBioTarget(phone: string, message: string): string {
  if (!validBioPhone(phone) || !message.trim() || message.length > 2000) throw new Error("Link inválido");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
