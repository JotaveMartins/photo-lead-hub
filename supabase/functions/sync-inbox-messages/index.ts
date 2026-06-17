import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeWhatsApp = (v: string | null | undefined) =>
  String(v || "").replace(/\D/g, "");

const whatsappMatchKey = (v: string | null | undefined) => {
  let d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  if (d.length === 11 && d[2] === "9") d = d.slice(0, 2) + d.slice(3);
  return d;
};

type SB = ReturnType<typeof createClient>;

interface EvolutionMsg {
  key?: { id?: string; remoteJid?: string; fromMe?: boolean; remoteJidAlt?: string; senderPn?: string };
  message?: any;
  messageTimestamp?: number | string;
  pushName?: string;
  messageType?: string;
}

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

async function findMessages(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  opts: { remoteJid?: string; sinceTimestamp?: number; take?: number },
): Promise<EvolutionMsg[]> {
  const where: any = {};
  if (opts.remoteJid) where.key = { remoteJid: opts.remoteJid };
  if (opts.sinceTimestamp) where.messageTimestamp = { gte: opts.sinceTimestamp };

  const body = {
    where,
    take: opts.take ?? 200,
    skip: 0,
    orderBy: { messageTimestamp: "desc" },
  };

  const resp = await fetch(`${baseUrl}/chat/findMessages/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) {
    // 404 = instance does not exist in the Evolution provider (stale name).
    // Log as info and skip — no point spamming errors.
    const level = resp.status === 404 ? "info" : "error";
    (console as any)[level === "info" ? "log" : "error"](
      `findMessages skipped (${resp.status}) for ${instanceName}: ${text.slice(0, 200)}`
    );
    return [];
  }
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { return []; }
  // Shape can be { messages: { records: [...] } } or a plain array
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.messages?.records)) return parsed.messages.records;
  if (Array.isArray(parsed?.records)) return parsed.records;
  if (Array.isArray(parsed?.messages)) return parsed.messages;
  return [];
}

function unwrapMessage(msg: any): any {
  if (!msg) return msg;
  return (
    msg.ephemeralMessage?.message ??
    msg.viewOnceMessage?.message ??
    msg.viewOnceMessageV2?.message ??
    msg.viewOnceMessageV2Extension?.message ??
    msg.documentWithCaptionMessage?.message ??
    msg
  );
}

function extractContent(rawMsg: any): { type: string; content: string } {
  const msg = unwrapMessage(rawMsg);
  if (!msg) return { type: "text", content: "" };
  if (msg.conversation) return { type: "text", content: msg.conversation };
  if (msg.extendedTextMessage?.text) return { type: "text", content: msg.extendedTextMessage.text };
  if (msg.imageMessage) return { type: "image", content: msg.imageMessage.caption || "" };
  if (msg.audioMessage) return { type: "audio", content: "" };
  if (msg.videoMessage) return { type: "video", content: msg.videoMessage.caption || "" };
  if (msg.documentMessage) return { type: "document", content: msg.documentMessage.caption || msg.documentMessage.fileName || "" };
  if (msg.stickerMessage) return { type: "image", content: "" };
  if (msg.reactionMessage) {
    const emoji = msg.reactionMessage.text || "";
    return { type: "text", content: emoji ? `Reagiu: ${emoji}` : "Removeu reação" };
  }
  return { type: "text", content: "" };
}

async function importMessage(
  supabase: SB,
  userId: string,
  instanceId: string,
  m: EvolutionMsg,
): Promise<"inserted" | "exists" | "skipped"> {
  const key = m.key || {};
  const whatsappMsgId = key.id;
  if (!whatsappMsgId) return "skipped";
  const remoteJid = key.remoteJid || "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) return "skipped";

  // Dedup by whatsapp_message_id
  const { data: existing } = await supabase
    .from("inbox_messages")
    .select("id")
    .eq("whatsapp_message_id", whatsappMsgId)
    .maybeSingle();
  if (existing) return "exists";

  // Identify JIDs
  let pnJid: string | null = null;
  let lidJid: string | null = null;
  const classify = (j: string | null | undefined) => {
    if (!j || typeof j !== "string") return;
    if (j.endsWith("@s.whatsapp.net") && !pnJid) pnJid = j;
    else if (j.endsWith("@lid") && !lidJid) lidJid = j;
  };
  classify(remoteJid);
  classify(key.remoteJidAlt);
  classify(key.senderPn);

  const pnDigits = pnJid ? normalizeWhatsApp(String(pnJid).split("@")[0]) : null;
  const lidDigits = lidJid ? normalizeWhatsApp(String(lidJid).split("@")[0]) : null;
  const whatsapp = pnDigits || lidDigits || normalizeWhatsApp(remoteJid.split("@")[0]);
  const contactJid = pnJid || lidJid || remoteJid;
  const pushName = (!key.fromMe && m.pushName) ? m.pushName : "";

  const { type, content } = extractContent(m.message);

  // Find or create conversation
  const knownIds = [pnDigits, lidDigits, whatsapp].filter((v, i, a) => v && a.indexOf(v) === i) as string[];
  const orFilter = knownIds
    .flatMap((id) => [`contact_number.eq.${id}`, `contact_lid.eq.${id}`])
    .join(",");

  let { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("instance_id", instanceId)
    .or(orFilter)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const inboundKey = whatsappMatchKey(whatsapp);
    if (inboundKey) {
      const { data: allConvs } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      const match = (allConvs || []).find(
        (c: any) => whatsappMatchKey(c.contact_number) === inboundKey,
      );
      if (match) {
        conversation = match;
        if (!match.instance_id && instanceId) {
          await supabase.from("inbox_conversations").update({ instance_id: instanceId }).eq("id", match.id);
          conversation.instance_id = instanceId;
        }
      }
    }
  }

  if (conversation && conversation.status === "closed" && !key.fromMe) {
    if (conversation.lead_id) {
      await supabase.from("inbox_conversations").update({ status: "open" }).eq("id", conversation.id);
      conversation.status = "open";
    } else {
      conversation = null;
    }
  }

  if (!conversation) {
    const { data: newConv, error: convError } = await supabase
      .from("inbox_conversations")
      .insert({
        user_id: userId,
        contact_number: whatsapp,
        contact_lid: lidDigits,
        contact_name: pushName || whatsapp,
        contact_jid: contactJid,
        is_group: false,
        status: "open",
        last_message: content,
        unread_count: key.fromMe ? 0 : 1,
        instance_id: instanceId,
      })
      .select()
      .single();
    if (convError) {
      console.error("Error creating conversation in sync:", convError);
      return "skipped";
    }
    conversation = newConv;

    // Try to link to existing lead by whatsappMatchKey
    const inboundKey = whatsappMatchKey(whatsapp);
    if (inboundKey) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, whatsapp")
        .eq("user_id", userId)
        .is("deleted_at", null);
      const lead = leads?.find((l) => whatsappMatchKey(l.whatsapp) === inboundKey);
      if (lead) {
        await supabase.from("inbox_conversations").update({ lead_id: lead.id }).eq("id", conversation.id);
        conversation.lead_id = lead.id;
      }
    }
  } else {
    const updates: Record<string, unknown> = {
      last_message: content,
      unread_count: key.fromMe ? (conversation.unread_count || 0) : (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    if (pnDigits && conversation.contact_number !== pnDigits) updates.contact_number = pnDigits;
    if (lidDigits && conversation.contact_lid !== lidDigits) updates.contact_lid = lidDigits;
    if (contactJid && conversation.contact_jid !== contactJid) updates.contact_jid = contactJid;
    if (pushName && (!conversation.contact_name || conversation.contact_name === conversation.contact_number)) {
      updates.contact_name = pushName;
    }
    await supabase.from("inbox_conversations").update(updates).eq("id", conversation.id);
  }

  // Insert the message. Rely on unique index to guard against race conditions.
  const ts = m.messageTimestamp
    ? new Date((typeof m.messageTimestamp === "string" ? parseInt(m.messageTimestamp, 10) : m.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  const { error: msgError } = await supabase
    .from("inbox_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: userId,
      body: content || null,
      direction: key.fromMe ? "outbound" : "inbound",
      whatsapp_message_id: whatsappMsgId,
      timestamp: ts,
      read: !!key.fromMe,
      type,
    });
  if (msgError) {
    // Unique violation = already there, treat as exists.
    if ((msgError as any).code === "23505") return "exists";
    console.error("Error inserting synced message:", msgError);
    return "skipped";
  }
  return "inserted";
}

async function syncForInstance(
  supabase: SB,
  instance: { id: string; name: string; user_id: string },
  baseUrl: string,
  apiKey: string,
  opts: { remoteJid?: string; sinceTimestamp?: number; take?: number },
) {
  const messages = await findMessages(baseUrl, apiKey, instance.name, opts);
  let inserted = 0;
  let exists = 0;
  let skipped = 0;
  for (const m of messages) {
    const r = await importMessage(supabase, instance.user_id, instance.id, m);
    if (r === "inserted") inserted++;
    else if (r === "exists") exists++;
    else skipped++;
  }
  return { total: messages.length, inserted, exists, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { baseUrl, apiKey } = await getEvolutionSettings(supabase);
    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode A: single conversation (on-demand from UI)
    if (body.conversation_id) {
      const { data: conv } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("id", body.conversation_id)
        .maybeSingle();
      if (!conv) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!conv.instance_id) {
        return new Response(JSON.stringify({ error: "Conversation has no instance attached" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("id, name, user_id")
        .eq("id", conv.instance_id)
        .maybeSingle();
      if (!inst) {
        return new Response(JSON.stringify({ error: "Instance not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try both PN and LID JIDs
      const jids: string[] = [];
      if (conv.contact_jid) jids.push(conv.contact_jid);
      if (conv.contact_number) jids.push(`${conv.contact_number}@s.whatsapp.net`);
      if (conv.contact_lid) jids.push(`${conv.contact_lid}@lid`);
      const uniqueJids = [...new Set(jids)];

      let totals = { total: 0, inserted: 0, exists: 0, skipped: 0 };
      for (const jid of uniqueJids) {
        const r = await syncForInstance(supabase, inst, baseUrl, apiKey, {
          remoteJid: jid,
          take: body.take ?? 50,
        });
        totals.total += r.total;
        totals.inserted += r.inserted;
        totals.exists += r.exists;
        totals.skipped += r.skipped;
      }
      return new Response(JSON.stringify({ ok: true, mode: "conversation", ...totals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode B: all connected instances (cron)
    if (body.mode === "all_instances") {
      const sinceMinutes = Number(body.since_minutes ?? 120);
      const sinceTimestamp = Math.floor((Date.now() - sinceMinutes * 60 * 1000) / 1000);
      const { data: instances } = await supabase
        .from("whatsapp_instances")
        .select("id, name, user_id")
        .eq("status", "connected");

      const results: any[] = [];
      for (const inst of instances || []) {
        try {
          const r = await syncForInstance(supabase, inst, baseUrl, apiKey, {
            sinceTimestamp,
            take: 200,
          });
          results.push({ instance: inst.name, ...r });
        } catch (e: any) {
          console.error(`Sync failed for ${inst.name}:`, e?.message || e);
          results.push({ instance: inst.name, error: e?.message || String(e) });
        }
      }
      return new Response(JSON.stringify({ ok: true, mode: "all_instances", sinceMinutes, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provide conversation_id or mode='all_instances'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-inbox-messages error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});