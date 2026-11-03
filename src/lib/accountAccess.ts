import { z } from "zod";

export const accountAccessSchema = z.object({
  user_id: z.string(),
  status: z.enum(["admin", "legacy", "trial", "manual", "expired", "blocked", "pending_confirmation", "unavailable"]),
  allowed: z.boolean(),
  mode: z.enum(["trial", "manual", "legacy"]).nullable(),
  plan: z.enum(["semestral", "anual"]).nullable(),
  trial_started_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  server_now: z.string(),
  days_remaining: z.number().int().nonnegative(),
});
export type AccountAccess = z.infer<typeof accountAccessSchema>;

export const CRM_PLANS = [
  { id: "semestral" as const, label: "Semestral", price: "R$ 300", period: "6 meses", action: "grant_semestral" as const },
  { id: "anual" as const, label: "Anual", price: "R$ 500", period: "1 ano", action: "grant_anual" as const },
];
export const CRM_SUPPORT_PHONE = "556133061009";
export const supportUrl = (plan?: string) => `https://wa.me/${CRM_SUPPORT_PHONE}?text=${encodeURIComponent(
  plan ? `Olá! Quero contratar o plano ${plan} do CRM. Podem me ajudar?` : "Olá! Quero continuar usando o CRM. Podem me ajudar com a contratação?",
)}`;
export const accessStatusLabel = (access: AccountAccess) => ({
  admin: "Administrador", legacy: "Acesso anterior mantido", trial: "Em teste", manual: "Plano ativo",
  expired: "Acesso vencido", blocked: "Conta bloqueada", pending_confirmation: "Aguardando confirmação de e-mail", unavailable: "Acesso não configurado",
})[access.status];
