import { createClient } from "npm:@supabase/supabase-js@2";
import { inspectProvider, metadata } from "./inspect.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sessão necessária" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: "Sessão inválida" }, 401);
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin, error: roleError } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (roleError || isAdmin !== true) return json({ error: "Acesso restrito ao administrador" }, 403);
    const body = await req.json().catch(() => null);
    const ids = body?.instance_ids;
    const from = body?.from; const to = body?.to;
    const jids = body?.jids ?? [];
    const maxPages = body?.max_pages ?? 1;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 7 || !ids.every(id => typeof id === "string" && uuid.test(id)) || new Set(ids).size !== ids.length)
      return json({ error: "Informe de 1 a 7 IDs de instâncias distintos" }, 400);
    if (typeof from !== "string" || typeof to !== "string" || !/(Z|[+-]\d\d:\d\d)$/.test(from) || !/(Z|[+-]\d\d:\d\d)$/.test(to) || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from) || Date.parse(to) - Date.parse(from) > 7 * 86400000)
      return json({ error: "Informe intervalo com fuso horário de até 7 dias" }, 400);
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 5 || !Array.isArray(jids) || jids.length > 4 || !jids.every(jid => typeof jid === "string" && /^\d{8,20}@(s\.whatsapp\.net|lid)$/.test(jid)) || (jids.length > 0 && ids.length !== 1) || ids.length * Math.max(1, jids.length) * maxPages > 10)
      return json({ error: "Consulta excede o limite; use uma instância para pesquisa por contato e até 10 páginas no total" }, 400);
    const { data: instances, error } = await db.from("whatsapp_instances").select("id, name, user_id, status").in("id", ids);
    if (error || instances?.length !== ids.length) return json({ error: "Instância não encontrada ou consulta indisponível" }, 400);
    const { data: config, error: configError } = await db.from("app_settings").select("value").eq("key", "evolution").maybeSingle();
    if (configError) return json({ error: "Configuração indisponível" }, 503);
    const settings = (config?.value ?? {}) as { base_url?: string; api_key?: string };
    const baseUrl = (settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const apiKey = settings.api_key || Deno.env.get("EVOLUTION_API_KEY");
    if (!baseUrl || !apiKey) return json({ error: "Provedor não configurado" }, 503);
    const results = [];
    for (const instance of instances) {
      const observedAt = new Date().toISOString();
      try {
        const provider = await inspectProvider(baseUrl, apiKey, instance.name, { from, to, jids, maxPages });
        const { data: logs, error: logError } = await db.from("webhook_logs")
          .select("created_at, payload").eq("user_id", instance.user_id).eq("instance_key", instance.name)
          .in("event", ["messages.upsert", "MESSAGES_UPSERT", "messages_upsert"])
          .gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }).limit(200);
        // webhook_logs has no index on these filters; a timeout must not discard the provider sample.
        const crmLogError = logError ? "CRM_LOG_QUERY_FAILED" : null;
        const arrivals = (logs ?? []).flatMap((log: any) => {
          const raw = log.payload?.data;
          return (Array.isArray(raw) ? raw : raw ? [raw] : []).map((message: unknown) => {
            const m = metadata(message);
            return { ...m, received_at: log.created_at, delay_seconds: m.sent_at && log.created_at ? Math.round((Date.parse(log.created_at) - Date.parse(m.sent_at)) / 1000) : null };
          });
        }).filter((m: any) => !m.is_group && !m.from_me).slice(0, 50);
        const providerIds = provider.messages.map(m => m.message_id).filter((id): id is string => !!id);
        const saved = new Set<string>();
        for (let offset = 0; offset < providerIds.length; offset += 100) {
          const { data: rows, error: savedError } = await db.from("inbox_messages").select("whatsapp_message_id")
            .eq("user_id", instance.user_id).in("whatsapp_message_id", providerIds.slice(offset, offset + 100));
          if (savedError) throw new Error("CRM_MESSAGE_QUERY_FAILED");
          for (const row of rows ?? []) saved.add(row.whatsapp_message_id);
        }
        results.push({ instance_id: instance.id, user_id: instance.user_id, observed_at: observedAt,
          provider_state: provider.state, provider_sample_limited: provider.sample_limited,
          provider_window_respected: provider.window_respected,
          provider_messages: provider.messages.map(m => ({ ...m, present_in_inbox: !!m.message_id && saved.has(m.message_id) })),
          crm_received_sample: arrivals, crm_log_limit: 200, crm_log_error: crmLogError, queue_status: "not_observed" });
      } catch (failure) {
        const code = failure instanceof Error && /^(PROVIDER_|CRM_)/.test(failure.message) ? failure.message : "DIAGNOSTIC_READ_FAILED";
        results.push({ instance_id: instance.id, observed_at: observedAt, error: code });
      }
    }
    return json({ read_only: true, from, to, results });
  } catch { return json({ error: "Consulta de diagnóstico indisponível" }, 500); }
});
