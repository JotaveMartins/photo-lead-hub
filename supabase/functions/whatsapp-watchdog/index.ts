import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import {
  type InstanceState, type RecentMessage, WATCHDOG,
  decideAction, diagnose, filterWatchedInstances, needsVolumeCheck, nextState,
} from "../_shared/whatsapp-watchdog.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const STATE_KEY = "whatsapp_watchdog";
const SETTINGS_RECHECK_MS = 6 * 3_600_000;
const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Vigia automático do WhatsApp. Executado a cada 10 min pelo agendamento gerenciado
 * (segredo privado de cron) ou manualmente por um administrador logado.
 * Detecta contas conectadas com mensagens atrasadas, silêncio anormal ou sessão fechada,
 * reinicia a sessão na Evolution (sem QR Code) e marca para reconexão quando não resolve.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Cron (segredo privado) ou administrador autenticado.
  let trigger = "cron";
  if (authenticateCronRequest(req)) {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Não autorizado" }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (isAdmin !== true) return json({ error: "Acesso restrito ao administrador" }, 403);
    trigger = "admin";
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;
  const now = new Date();

  const { data: config } = await db.from("app_settings").select("value").eq("key", "evolution").maybeSingle();
  const settings = (config?.value ?? {}) as { base_url?: string; api_key?: string };
  const baseUrl = (settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
  const apiKey = settings.api_key || Deno.env.get("EVOLUTION_API_KEY");
  if (!baseUrl || !apiKey) return json({ error: "Servidor do WhatsApp não configurado" }, 503);

  const evo = (path: string, init: RequestInit = {}) =>
    fetch(`${baseUrl}${path}`, { ...init, headers: { apikey: apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });

  const { data: stateRow } = await db.from("app_settings").select("value").eq("key", STATE_KEY).maybeSingle();
  const prevStates = ((stateRow?.value as any)?.instances ?? {}) as Record<string, InstanceState & { name?: string }>;

  const { data: connected, error } = await db.from("whatsapp_instances")
    .select("id, name, user_id, status").eq("status", "connected");
  if (error) return json({ error: "Falha ao listar conexões" }, 500);

  // Ignora contas bloqueadas ou sem acesso ativo ao CRM (ex-clientes, teste vencido).
  const ownerIds = [...new Set((connected ?? []).map((i) => i.user_id).filter(Boolean) as string[])];
  const activeUserIds = new Set<string>();
  await Promise.all(ownerIds.map(async (uid) => {
    const { data: active, error: accessError } = await db.rpc("has_active_crm_access", { p_user_id: uid });
    // Em caso de falha na consulta, mantém a conta vigiada (não desliga o vigia por engano).
    if (accessError || active === true) activeUserIds.add(uid);
  }));
  const instances = filterWatchedInstances(connected ?? [], activeUserIds);
  const skipped = (connected ?? []).filter((i) => !instances.includes(i)).map((i) => i.name);
  if (skipped.length) console.log("watchdog_skipped_inactive_accounts", { instances: skipped });

  const since = new Date(now.getTime() - WATCHDOG.SILENCE_HOURS * 3_600_000).toISOString();

  const results = await Promise.all((instances ?? []).map(async (inst) => {
    const prev = prevStates[inst.id];
    let providerState: string | null = null;
    try {
      const r = await evo(`/instance/connectionState/${encodeURIComponent(inst.name)}`);
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        providerState = d?.instance?.state ?? d?.state ?? null;
      } else if (r.status === 404) {
        providerState = "not_found";
      }
    } catch (_) { /* servidor lento: avalia só pelo CRM */ }

    const { data: rows } = await db.from("inbox_messages")
      .select("timestamp, created_at, direction, inbox_conversations!inner(instance_id)")
      .eq("user_id", inst.user_id)
      .eq("inbox_conversations.instance_id", inst.id)
      .gte("created_at", since)
      .not("is_note", "is", true)
      .order("created_at", { ascending: false })
      .limit(300);
    const recent: RecentMessage[] = (rows ?? []).map((m: any) => ({ sent_at: m.timestamp, saved_at: m.created_at, direction: m.direction }));

    let inbound7d: number | null = null;
    if (needsVolumeCheck(recent, now)) {
      const { count } = await db.from("inbox_messages")
        .select("id, inbox_conversations!inner(instance_id)", { count: "exact", head: true })
        .eq("user_id", inst.user_id)
        .eq("inbox_conversations.instance_id", inst.id)
        .eq("direction", "inbound")
        .gte("created_at", new Date(now.getTime() - 7 * 86_400_000).toISOString());
      inbound7d = count ?? 0;
    }

    const diagnosis = providerState === "not_found"
      ? { status: "closed" as const, reason: "Conexão não existe no servidor do WhatsApp", lagSeconds: null }
      : diagnose({ providerState, recent, inbound7d }, now);
    // Conexão inexistente no servidor não se resolve reiniciando: vai direto para reconexão.
    const action = providerState === "not_found" ? "flag" : decideAction(diagnosis, prev ?? { restarts: [] }, now);

    let restarted = false;
    let restartError: string | null = null;
    if (action === "restart" && !dryRun) {
      try {
        const r = await evo(`/instance/restart/${encodeURIComponent(inst.name)}`, { method: "POST" });
        restarted = r.ok;
        if (!r.ok) restartError = `HTTP ${r.status}`;
      } catch (e) {
        restartError = e instanceof Error ? e.message : "erro";
      }
    }

    // Garante "ignorar grupos" (a cada 6 h), sem mexer no "sempre online" nem nas demais opções.
    let settingsCheckedAt = prev?.settings_checked_at ?? null;
    if (!dryRun && providerState === "open" && (!settingsCheckedAt || now.getTime() - Date.parse(settingsCheckedAt) > SETTINGS_RECHECK_MS)) {
      try {
        const r = await evo(`/settings/find/${encodeURIComponent(inst.name)}`);
        const cur: any = r.ok ? await r.json().catch(() => ({})) : null;
        if (cur && cur.groupsIgnore !== true) {
          await evo(`/settings/set/${encodeURIComponent(inst.name)}`, {
            method: "POST",
            body: JSON.stringify({
              rejectCall: cur.rejectCall ?? false, msgCall: cur.msgCall ?? "",
              alwaysOnline: cur.alwaysOnline ?? false, readMessages: cur.readMessages ?? false,
              readStatus: cur.readStatus ?? false, syncFullHistory: cur.syncFullHistory ?? false,
              groupsIgnore: true,
            }),
          });
          console.log("watchdog_groups_ignore_enabled", { instance: inst.name });
        }
        if (cur) settingsCheckedAt = now.toISOString();
      } catch (_) { /* tenta de novo na próxima rodada */ }
    }

    const state = { ...nextState(prev, diagnosis, action, restarted, now), settings_checked_at: settingsCheckedAt, name: inst.name };
    if (diagnosis.status !== "ok" || restarted || restartError) {
      console.log("watchdog_check", { instance: inst.name, status: diagnosis.status, reason: diagnosis.reason, action, restarted, restartError, providerState, dryRun });
    }
    return { id: inst.id, state, action, restarted, restartError, providerState };
  }));

  if (!dryRun) {
    const instancesState: Record<string, unknown> = {};
    for (const r of results) instancesState[r.id] = r.state;
    const { error: saveError } = await db.from("app_settings").upsert(
      { key: STATE_KEY, value: { updated_at: now.toISOString(), trigger, instances: instancesState }, updated_at: now.toISOString() },
      { onConflict: "key" },
    );
    if (saveError) console.error("watchdog_state_save_failed", saveError.message);
  }

  return json({
    checked: results.length,
    skipped_inactive: skipped,
    dry_run: dryRun,
    trigger,
    problems: results.filter((r) => r.state.status !== "ok").map((r) => ({
      instance: r.state.name, status: r.state.status, reason: r.state.reason, action: r.action,
      restarted: r.restarted, restart_error: r.restartError, needs_reconnect: r.state.needs_reconnect,
      restarts_24h: r.state.restarts.length,
    })),
  });
});
