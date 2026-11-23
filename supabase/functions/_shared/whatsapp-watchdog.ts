// Regras do vigia automático do WhatsApp (sem dependências de runtime, testável no Vitest).

export const WATCHDOG = {
  /** Mensagem gravada mais de 15 min depois de enviada = atraso. */
  LAG_LIMIT_SECONDS: 15 * 60,
  /** Janela usada para medir atraso. */
  LAG_WINDOW_MINUTES: 60,
  /** Quantas mensagens atrasadas na janela confirmam o travamento. */
  MIN_LAGGED_MESSAGES: 3,
  /** Silêncio total por 3 h em horário comercial numa conta movimentada. */
  SILENCE_HOURS: 3,
  /** "Conta movimentada" = média de pelo menos 30 mensagens recebidas por dia (últimos 7 dias). */
  MIN_DAILY_INBOUND: 30,
  /** Silêncio só é avaliado quando as 3 h inteiras caem entre 09:00 e 22:00 (Brasília). */
  BUSINESS_START_HOUR: 9,
  BUSINESS_END_HOUR: 22,
  /** Intervalo mínimo entre dois reinícios da mesma conta. */
  COOLDOWN_MINUTES: 45,
  /** Acima disso em 24 h, a conta é marcada para reconexão por QR Code. */
  MAX_RESTARTS_PER_DAY: 6,
} as const;

export type WatchdogStatus = "ok" | "delayed" | "silent" | "closed";

export interface RecentMessage {
  /** Horário original do WhatsApp (inbox_messages.timestamp). */
  sent_at: string | null;
  /** Horário em que o CRM gravou (inbox_messages.created_at). */
  saved_at: string;
  direction: string;
}

export interface InstanceSnapshot {
  /** Estado informado pela Evolution (open, connecting, close...) ou null se não respondeu. */
  providerState: string | null;
  /** Mensagens gravadas nas últimas SILENCE_HOURS horas. */
  recent: RecentMessage[];
  /** Mensagens recebidas nos últimos 7 dias (só consultado quando necessário). */
  inbound7d: number | null;
}

export interface InstanceState {
  restarts: string[];
  needs_reconnect: boolean;
  status: WatchdogStatus;
  reason: string | null;
  lag_seconds: number | null;
  checked_at: string | null;
  settings_checked_at?: string | null;
}

export interface Diagnosis {
  status: WatchdogStatus;
  reason: string | null;
  lagSeconds: number | null;
}

export type WatchdogAction = "none" | "restart" | "wait" | "flag";

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

export function saoPauloHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(now);
  return Number(h) % 24;
}

/** A janela de silêncio inteira precisa estar dentro do horário comercial de Brasília. */
export function isSilenceWindowInBusinessHours(now: Date): boolean {
  const hour = saoPauloHour(now);
  return hour >= WATCHDOG.BUSINESS_START_HOUR + WATCHDOG.SILENCE_HOURS && hour < WATCHDOG.BUSINESS_END_HOUR;
}

export function lagSeconds(m: RecentMessage): number | null {
  const sent = ms(m.sent_at);
  const saved = ms(m.saved_at);
  if (!Number.isFinite(sent) || !Number.isFinite(saved)) return null;
  return Math.max(0, Math.round((saved - sent) / 1000));
}

/** Precisa consultar o volume de 7 dias? Só quando não há nenhuma mensagem e é horário de avaliar silêncio. */
export function needsVolumeCheck(recent: RecentMessage[], now: Date): boolean {
  return recent.length === 0 && isSilenceWindowInBusinessHours(now);
}

export function diagnose(snapshot: InstanceSnapshot, now: Date): Diagnosis {
  if (snapshot.providerState && snapshot.providerState !== "open") {
    return { status: "closed", reason: `Servidor informa estado "${snapshot.providerState}"`, lagSeconds: null };
  }
  const windowStart = now.getTime() - WATCHDOG.LAG_WINDOW_MINUTES * 60_000;
  const lags = snapshot.recent
    .filter((m) => ms(m.saved_at) >= windowStart)
    .map(lagSeconds)
    .filter((l): l is number => l !== null);
  const lagged = lags.filter((l) => l > WATCHDOG.LAG_LIMIT_SECONDS);
  const worst = lags.length ? Math.max(...lags) : null;
  if (lagged.length >= WATCHDOG.MIN_LAGGED_MESSAGES && lagged.length * 2 >= lags.length) {
    const sorted = [...lagged].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { status: "delayed", reason: `${lagged.length} mensagens chegaram com atraso (mediana ${Math.round(median / 60)} min)`, lagSeconds: median };
  }
  if (
    snapshot.recent.length === 0 &&
    isSilenceWindowInBusinessHours(now) &&
    (snapshot.inbound7d ?? 0) >= WATCHDOG.MIN_DAILY_INBOUND * 7
  ) {
    return { status: "silent", reason: `Nenhuma mensagem há ${WATCHDOG.SILENCE_HOURS} h numa conta movimentada`, lagSeconds: null };
  }
  return { status: "ok", reason: null, lagSeconds: worst };
}

export function restartsInLastDay(state: Pick<InstanceState, "restarts">, now: Date): string[] {
  const since = now.getTime() - 24 * 3_600_000;
  return (state.restarts ?? []).filter((r) => ms(r) >= since);
}

export function decideAction(diagnosis: Diagnosis, state: Pick<InstanceState, "restarts">, now: Date): WatchdogAction {
  if (diagnosis.status === "ok") return "none";
  const recent = restartsInLastDay(state, now);
  if (recent.length >= WATCHDOG.MAX_RESTARTS_PER_DAY) return "flag";
  const last = recent.length ? Math.max(...recent.map(ms)) : NaN;
  if (Number.isFinite(last) && now.getTime() - last < WATCHDOG.COOLDOWN_MINUTES * 60_000) return "wait";
  return "restart";
}

/** Aplica o resultado da verificação ao estado salvo da conta. */
export function nextState(prev: InstanceState | undefined, diagnosis: Diagnosis, action: WatchdogAction, restarted: boolean, now: Date): InstanceState {
  const base: InstanceState = prev ?? { restarts: [], needs_reconnect: false, status: "ok", reason: null, lag_seconds: null, checked_at: null };
  const restarts = restartsInLastDay(base, now);
  if (restarted) restarts.push(now.toISOString());
  return {
    ...base,
    restarts,
    status: diagnosis.status,
    reason: diagnosis.reason,
    lag_seconds: diagnosis.lagSeconds,
    checked_at: now.toISOString(),
    // Volta ao normal sozinha quando as mensagens voltam a chegar em dia.
    needs_reconnect: diagnosis.status === "ok" ? false : base.needs_reconnect || action === "flag",
  };
}

/**
 * Só vigia conexões de contas com acesso ativo ao CRM (has_active_crm_access):
 * contas bloqueadas, de ex-clientes ou com teste/plano vencido ficam de fora,
 * para não reiniciar nem pedir reconexão de quem não usa mais o sistema.
 */
export function filterWatchedInstances<T extends { user_id: string | null }>(
  instances: T[],
  activeUserIds: ReadonlySet<string>,
): T[] {
  return instances.filter((i) => !!i.user_id && activeUserIds.has(i.user_id));
}
