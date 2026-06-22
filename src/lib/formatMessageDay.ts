import { parseISO, isToday, isYesterday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Returns a localized day key (YYYY-MM-DD in America/Sao_Paulo) for grouping. */
export const messageDayKey = (ts: string | null | undefined): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  // pt-BR returns DD/MM/YYYY in SP timezone — good enough as a stable key
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

/** Human-readable label: "Hoje", "Ontem" or "22 de jun de 2026". */
export const formatMessageDayLabel = (ts: string | null | undefined): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMM 'de' yyyy", { locale: ptBR });
};