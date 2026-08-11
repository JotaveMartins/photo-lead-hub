import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SB = ReturnType<typeof createClient>;

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const whatsappMatchKey = (v: string | null | undefined) => {
  let d = digits(v);
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  if (d.length === 11 && d[2] === "9") d = d.slice(0, 2) + d.slice(3);
  return d;
};

async function getEvolutionSettings(supabase: SB) {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "evolution")
    .maybeSingle();
  const settings: any = data?.value || {};
  const baseUrl = (settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
  const apiKey = settings.api_key || Deno.env.get("EVOLUTION_API_KEY");
  return { baseUrl, apiKey };
}

async function evoPost(baseUrl: string, apiKey: string, path: string, body: unknown): Promise<any> {
  try {
    const resp = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify(body ?? {}),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.log(`evo ${path} -> ${resp.status}: ${text.slice(0, 200)}`);
      return null;
    }
    try { return JSON.parse(text); } catch { return null; }
  } catch (e) {
    console.log(`evo ${path} failed:`, (e as Error).message);
    return null;
  }
}

function pickFromMessages(payload: any, ownerDigits: string): { phone?: string; name?: string } {
  const records: any[] =
    (Array.isArray(payload) && payload) ||
    payload?.messages?.records ||
    payload?.records ||
    [];
  const out: { phone?: string; name?: string } = {};
  for (const rec of records) {
    const key = rec?.key || {};
    if (key.fromMe) continue; // outbound records carry OUR number / "Você"
    const candidates = [key.senderPn, key.remoteJidAlt, key.participantPn, key.participantAlt];
    for (const c of candidates) {
      const m = String(c || "").match(/^(\d{10,15})@s\.whatsapp\.net$/);
      if (m && m[1] !== ownerDigits && !out.phone) out.phone = m[1];
    }
    const pn = String(rec?.pushName || "").trim();
    if (pn && pn.toLowerCase() !== "você" && !/^\d+$/.test(pn) && !out.name) out.name = pn;
    if (out.phone && out.name) break;
  }
  return out;
}

async function resolveLid(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  lid: string,
  ownerDigits: string,
): Promise<{ phone?: string; name?: string }> {
  const lidJid = `${lid}@lid`;
  const result: { phone?: string; name?: string } = {};

  const msgs = await evoPost(baseUrl, apiKey, `chat/findMessages/${instanceName}`, {
    where: { key: { remoteJid: lidJid } },
    take: 50,
    skip: 0,
  });
  if (msgs) {
    const found = pickFromMessages(msgs, ownerDigits);
    if (found.phone) result.phone = found.phone;
    if (found.name) result.name = found.name;
  }

  if (!result.name) {
    const contacts = await evoPost(baseUrl, apiKey, `chat/findContacts/${instanceName}`, {
      where: { remoteJid: lidJid },
    });
    const arr: any[] = Array.isArray(contacts) ? contacts : (contacts?.records || []);
    for (const c of arr) {
      const pn = String(c?.pushName || c?.name || "").trim();
      if (pn && !/^\d+$/.test(pn)) { result.name = pn; break; }
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const targetUserId: string | undefined = body.user_id;
    const dryRun: boolean = !!body.dry_run;
    const limit: number = Math.min(Number(body.limit ?? 200), 500);
    const conversationId: string | undefined = body.conversation_id;
    const conversationIds: string[] | undefined = Array.isArray(body.conversation_ids)
      ? body.conversation_ids
      : undefined;

    const { baseUrl, apiKey } = await getEvolutionSettings(supabase);
    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ error: "Evolution não configurada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = supabase
      .from("inbox_conversations")
      .select("id, user_id, instance_id, contact_name, contact_number, contact_jid, contact_lid, lead_id")
      .like("contact_jid", "%@lid")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (targetUserId) q = q.eq("user_id", targetUserId);
    if (conversationId) q = q.eq("id", conversationId);
    if (conversationIds && conversationIds.length > 0) q = q.in("id", conversationIds);
    const { data: convs, error } = await q;
    if (error) throw error;

    // Only conversations still keyed by the LID
    const targets = (convs || []).filter((c: any) => {
      const lid = digits(c.contact_lid) || (String(c.contact_jid || "").endsWith("@lid") ? digits(c.contact_jid) : "");
      return !!lid && digits(c.contact_number) === lid;
    });

    // Cache instance names
    const instCache = new Map<string, { name: string; owner: string }>();
    const getInstance = async (conv: any): Promise<{ name: string; owner: string } | null> => {
      if (conv.instance_id) {
        if (instCache.has(conv.instance_id)) return instCache.get(conv.instance_id)!;
        const { data } = await supabase
          .from("whatsapp_instances").select("name, phone_number").eq("id", conv.instance_id).maybeSingle();
        if (data?.name) {
          const inst = { name: data.name as string, owner: digits(data.phone_number) };
          instCache.set(conv.instance_id, inst);
          return inst;
        }
      }
      const { data: connected } = await supabase
        .from("whatsapp_instances").select("id, name, phone_number").eq("user_id", conv.user_id).eq("status", "connected");
      if (connected && connected.length === 1) {
        return { name: connected[0].name as string, owner: digits(connected[0].phone_number) };
      }
      return null;
    };

    const results: any[] = [];
    let updated = 0;

    for (const conv of targets) {
      const lid = digits(conv.contact_lid) || digits(conv.contact_jid);
      const inst = await getInstance(conv);
      if (!inst) {
        results.push({ id: conv.id, lid, status: "sem_instancia" });
        continue;
      }

      if (body.debug) {
        const lidJid = `${lid}@lid`;
        const msgs = await evoPost(baseUrl, apiKey, `chat/findMessages/${inst.name}`, {
          where: { key: { remoteJid: lidJid } }, take: 10, skip: 0,
        });
        const recs: any[] = (Array.isArray(msgs) && msgs) || msgs?.messages?.records || msgs?.records || [];
        const chats = await evoPost(baseUrl, apiKey, `chat/findChats/${inst.name}`, {
          where: { remoteJid: lidJid },
        });
        const chatArr: any[] = (Array.isArray(chats) && chats) || chats?.records || [];
        results.push({
          id: conv.id, lid, status: "debug",
          msgKeys: recs.slice(0, 6).map((r) => ({ ...(r?.key || {}), pushName: r?.pushName, participant: r?.participant })),
          chats: chatArr.slice(0, 3),
        });
        continue;
      }

      const { phone, name } = await resolveLid(baseUrl, apiKey, inst.name, lid, inst.owner);
      if (!phone) {
        results.push({ id: conv.id, lid, status: "nao_resolvido", name: name || null });
        continue;
      }

      if (dryRun) {
        results.push({ id: conv.id, lid, status: "resolvido_dry_run", phone, name: name || null });
        continue;
      }

      const updates: Record<string, unknown> = {
        contact_number: phone,
        contact_jid: `${phone}@s.whatsapp.net`,
        contact_lid: lid,
      };
      if (!conv.contact_name || digits(conv.contact_name) === lid) {
        updates.contact_name = name || phone;
      }

      const { error: upErr } = await supabase
        .from("inbox_conversations").update(updates).eq("id", conv.id);
      if (upErr) {
        results.push({ id: conv.id, lid, status: "erro", error: upErr.message });
        continue;
      }

      // Fix the linked lead too
      if (conv.lead_id) {
        const { data: lead } = await supabase
          .from("leads").select("id, nome, whatsapp").eq("id", conv.lead_id).maybeSingle();
        if (lead) {
          const leadUpdates: Record<string, unknown> = {};
          if (digits(lead.whatsapp) === lid || whatsappMatchKey(lead.whatsapp) !== whatsappMatchKey(phone)) {
            leadUpdates.whatsapp = phone;
          }
          const leadName = String(lead.nome || "");
          if (digits(leadName) === lid || leadName.includes(lid)) {
            leadUpdates.nome = name || phone;
          }
          if (Object.keys(leadUpdates).length > 0) {
            await supabase.from("leads").update(leadUpdates).eq("id", lead.id);
          }
        }
      }

      updated++;
      results.push({ id: conv.id, lid, status: "atualizado", phone, name: name || null });
    }

    return new Response(JSON.stringify({ ok: true, scanned: targets.length, updated, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("resolve-lid-contacts error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
