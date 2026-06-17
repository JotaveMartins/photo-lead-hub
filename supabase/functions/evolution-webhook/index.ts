import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const normalizeWhatsApp = (value: string | null | undefined) => String(value || "").replace(/\D/g, "");

// Canonical key to compare two WhatsApp numbers regardless of formatting/DDI.
// Strips non-digits, drops a leading "55" if present, keeps last 11 digits.
const whatsappMatchKey = (value: string | null | undefined) => {
  let d = String(value || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  // Brazil mobile fallback: collapse 11-digit mobile (DDD+9+8) into 10-digit (DDD+8)
  if (d.length === 11 && d[2] === "9") {
    d = d.slice(0, 2) + d.slice(3);
  }
  return d;
};

// Lowercase + strip accents (ç→c, á→a) for robust keyword matching
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const normalizeText = (value: string | null | undefined) =>
  String(value || "").normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/ogg": "ogv", "video/webm": "webm",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/webm": "weba",
  "application/pdf": "pdf",
};

function findBase64InPayload(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === "string" && payload.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(payload.slice(0, 200))) {
    return payload;
  }
  if (typeof payload !== "object") return null;
  // Common locations
  const candidates = [
    payload.base64,
    typeof payload.media === "string" ? payload.media : payload.media?.base64,
    payload.data?.base64,
    payload.imageMessage?.base64,
    payload.videoMessage?.base64,
    payload.audioMessage?.base64,
    payload.documentMessage?.base64,
    payload.stickerMessage?.base64,
    payload.message?.base64,
    payload.message?.imageMessage?.base64,
    payload.message?.videoMessage?.base64,
    payload.message?.audioMessage?.base64,
    payload.message?.documentMessage?.base64,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 500) return c;
  }
  return null;
}

// Detect actual file type from binary signature (magic bytes)
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  // WEBP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length > 11 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  // PDF: 25 50 44 46
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  // MP4 / quicktime: bytes 4-7 = "ftyp"
  if (bytes.length > 7 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "video/mp4";
  // OGG: 4F 67 67 53
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return "audio/ogg";
  // MP3: ID3 tag or FF Fx frame sync
  if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) return "audio/mpeg";
  // RIFF (WAV)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length > 11 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return "audio/wav";
  return null;
}

async function uploadBase64ToStorage(
  supabase: ReturnType<typeof createClient>,
  rawBase64: string,
  userId: string,
  whatsappMsgId: string,
  mimeType: string | null
): Promise<string | null> {
  try {
    const matches = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
    const hintedMime = matches?.[1] || mimeType || "application/octet-stream";
    // Strip whitespace/newlines that some APIs add
    const b64 = (matches?.[2] || rawBase64).replace(/\s+/g, "");

    let binary: string;
    try {
      binary = atob(b64);
    } catch (err) {
      console.error("Invalid base64 (atob failed):", err);
      return null;
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Validate: detect actual file type from magic bytes
    const detectedMime = detectMimeFromBytes(bytes);
    if (!detectedMime) {
      console.error(
        `Base64 decoded ${bytes.length} bytes but no valid magic bytes detected. ` +
        `First 16 bytes (hex): ${Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join(" ")}. ` +
        `Hinted MIME was: ${hintedMime}. ` +
        `This usually means we got encrypted WhatsApp bytes — webhookBase64:true must be enabled on the Evolution webhook.`
      );
      return null;
    }
    if (hintedMime && hintedMime !== detectedMime && !hintedMime.startsWith("application/octet-stream")) {
      console.log(`MIME hint "${hintedMime}" differs from detected "${detectedMime}" — using detected.`);
    }

    const finalMime = detectedMime;
    const ext = MIME_TO_EXT[finalMime] || "bin";
    const path = `${userId}/${whatsappMsgId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("inbox-media")
      .upload(path, bytes, { contentType: finalMime, upsert: true });
    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return null;
    }

    const { data: urlData } = supabase.storage.from("inbox-media").getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error("uploadBase64ToStorage error:", err);
    return null;
  }
}

async function downloadAndStoreMedia(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  fullPayload: any,
  msgKey: any,
  msgContent: any,
  userId: string,
  whatsappMsgId: string,
  mimeType: string | null
): Promise<string | null> {
  // 1) Try base64 directly from the webhook payload (when webhookBase64: true)
  const directB64 =
    findBase64InPayload(msgContent) ||
    findBase64InPayload(fullPayload?.data) ||
    findBase64InPayload(fullPayload);
  if (directB64) {
    console.log(`Found direct base64 in webhook payload (${directB64.length} chars)`);
    const url = await uploadBase64ToStorage(supabase, directB64, userId, whatsappMsgId, mimeType);
    if (url) {
      console.log("Stored media from direct base64:", url);
      return url;
    }
  } else {
    const dataKeys = Object.keys(fullPayload?.data || {}).join(",");
    const msgKeys = Object.keys(msgContent || {}).join(",");
    console.log(`No direct base64 in payload. data keys: [${dataKeys}], message keys: [${msgKeys}]. webhookBase64 may be disabled — falling back to API.`);
  }

  // 2) Fall back to Evolution API — try a few request shapes/endpoints
  try {
    const { data: settingsRow } = await supabase
      .from("app_settings").select("value").eq("key", "evolution").maybeSingle();
    const settings: any = settingsRow?.value || {};
    const baseUrl = (settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const apiKey = settings.api_key || Deno.env.get("EVOLUTION_API_KEY");
    if (!baseUrl || !apiKey) {
      console.error("Evolution API not configured for media download");
      return null;
    }

    const attempts: { endpoint: string; body: any }[] = [
      // Evolution v2 — official shape
      { endpoint: `/chat/getBase64FromMediaMessage/${instanceName}`,
        body: { message: { key: msgKey, message: msgContent }, convertToMp4: false } },
      // Some versions accept the message flat
      { endpoint: `/chat/getBase64FromMediaMessage/${instanceName}`,
        body: { key: msgKey, message: msgContent } },
    ];

    for (const att of attempts) {
      const resp = await fetch(`${baseUrl}${att.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(att.body),
      });
      const text = await resp.text();
      if (!resp.ok) {
        console.error(`getBase64 attempt failed (${resp.status}):`, text.slice(0, 300));
        continue;
      }
      let result: any;
      try { result = JSON.parse(text); } catch { continue; }
      const raw = findBase64InPayload(result);
      if (!raw) {
        console.error("getBase64 returned no base64. Response keys:", Object.keys(result || {}).join(","));
        continue;
      }
      const url = await uploadBase64ToStorage(supabase, raw, userId, whatsappMsgId, mimeType);
      if (url) {
        console.log("Stored media from API base64:", url);
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error("downloadAndStoreMedia API path error:", err);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    const rawEvent: string = payload.event || "";
    // Normalize event: "MESSAGES_UPSERT" / "messages.upsert" → "messages.upsert"
    const event = rawEvent.toLowerCase().replace(/_/g, ".");
    const data = payload.data;
    const instanceName = payload.instance || payload.instanceName;
    console.log("Webhook received:", { event, instanceName });

    // Find the user_id associated with this instance
    const { data: instanceData } = await supabase
      .from("whatsapp_instances")
      .select("id, user_id")
      .eq("name", instanceName)
      .maybeSingle();

    const userId = instanceData?.user_id;
    const instanceId = instanceData?.id;
    if (!userId) {
      console.error(`No user found for instance: ${instanceName}`);
      return new Response(JSON.stringify({ error: "Instance user not found" }), { status: 404 });
    }

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      instance_key: instanceName,
      event,
      payload,
      user_id: userId
    });

    if (event === "messages.upsert") {
      const message = data.message;
      const key = data.key;
      const remoteJid = key.remoteJid;
      const isGroup = remoteJid.endsWith("@g.us");

      // A contact can have two identities: the phone-number JID (@s.whatsapp.net)
      // and the LID (@lid). Collect both from every field WhatsApp may use, so we
      // can match the same person regardless of which identity a message arrives on.
      let pnJid: string | null = null;
      let lidJid: string | null = null;
      const classifyJid = (j: string | null | undefined) => {
        if (!j || typeof j !== "string") return;
        if (j.endsWith("@s.whatsapp.net") && !pnJid) pnJid = j;
        else if (j.endsWith("@lid") && !lidJid) lidJid = j;
      };
      classifyJid(remoteJid);
      classifyJid(key.remoteJidAlt);
      classifyJid(key.senderPn);
      classifyJid(data.senderPn);
      classifyJid(data.key?.remoteJidAlt);

      const pnDigits = pnJid ? normalizeWhatsApp(String(pnJid).split("@")[0]) : null;
      const lidDigits = lidJid ? normalizeWhatsApp(String(lidJid).split("@")[0]) : null;
      // Canonical number for display/lead-matching: prefer the real phone number
      const whatsapp = pnDigits || lidDigits || normalizeWhatsApp(remoteJid.split("@")[0]);
      // Best JID to reply to: real phone JID when known, else the LID
      const contactJid = pnJid || lidJid || remoteJid;

      console.log(`[lid] remoteJid=${remoteJid}, remoteJidAlt=${key.remoteJidAlt}, senderPn=${key.senderPn}, pnDigits=${pnDigits}, lidDigits=${lidDigits}, canonical=${whatsapp}`);

      if (isGroup) {
        console.log("Skipping group message:", remoteJid);
        return new Response(JSON.stringify({ success: true, message: "Group message ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      // pushName is the SENDER's name. For messages we send (fromMe), that's our own
      // name, not the contact's — so only trust it for inbound messages.
      const pushName = (!key.fromMe && data.pushName) ? data.pushName : "";

      // 1. Determine message content
      // Unwrap containers that hide the real payload (ephemeral / view-once / etc.)
      const realMessage =
        message?.ephemeralMessage?.message ??
        message?.viewOnceMessage?.message ??
        message?.viewOnceMessageV2?.message ??
        message?.viewOnceMessageV2Extension?.message ??
        message?.documentWithCaptionMessage?.message ??
        message ?? {};

      let type = "text";
      let content = "";
      let mediaUrl: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;
      if (realMessage.conversation) content = realMessage.conversation;
      else if (realMessage.extendedTextMessage) content = realMessage.extendedTextMessage.text;
      else if (realMessage.imageMessage) {
        type = "image";
        content = realMessage.imageMessage.caption || "";
        mediaMimeType = realMessage.imageMessage.mimetype || "image/jpeg";
        mediaUrl = realMessage.imageMessage.url || null;
      }
      else if (realMessage.audioMessage) {
        type = "audio";
        mediaMimeType = realMessage.audioMessage.mimetype || "audio/ogg";
        mediaUrl = realMessage.audioMessage.url || null;
      }
      else if (realMessage.videoMessage) {
        type = "video";
        content = realMessage.videoMessage.caption || "";
        mediaMimeType = realMessage.videoMessage.mimetype || "video/mp4";
        mediaUrl = realMessage.videoMessage.url || null;
      }
      else if (realMessage.documentMessage) {
        type = "document";
        content = realMessage.documentMessage.caption || realMessage.documentMessage.fileName || "";
        mediaMimeType = realMessage.documentMessage.mimetype || null;
        mediaFilename = realMessage.documentMessage.fileName || null;
        mediaUrl = realMessage.documentMessage.url || null;
      }
      else if (realMessage.stickerMessage) {
        type = "image";
        mediaUrl = realMessage.stickerMessage.url || null;
        mediaMimeType = realMessage.stickerMessage.mimetype || "image/webp";
      }
      else if (realMessage.reactionMessage) {
        type = "text";
        const emoji = realMessage.reactionMessage.text || "";
        content = emoji ? `Reagiu: ${emoji}` : "Removeu reação";
      }

      // 2. Find or create inbox conversation.
      // Match by ANY known identifier (phone digits or LID) against contact_number/contact_lid,
      // so the same person isn't split into two conversations across their PN and @lid identities.
      const knownIds = [pnDigits, lidDigits, whatsapp].filter((v, i, a) => v && a.indexOf(v) === i) as string[];
      const orFilter = knownIds
        .flatMap((id) => [`contact_number.eq.${id}`, `contact_lid.eq.${id}`])
        .join(",");
      // First try exact identifier match on this instance (fast path)
      let { data: conversation } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("instance_id", instanceId)
        .or(orFilter)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: fuzzy match by canonical key across ALL conversations of this user
      // (handles conversations created via lead chat without instance_id, and the
      //  Brazil "missing 9th digit" case).
      if (!conversation) {
        const inboundKey = whatsappMatchKey(whatsapp);
        if (inboundKey) {
          const { data: allConvs } = await supabase
            .from("inbox_conversations")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false });
          const match = (allConvs || []).find(
            (c: any) => whatsappMatchKey(c.contact_number) === inboundKey
          );
          if (match) {
            conversation = match;
            // Adopt the instance if the existing conversation had none
            if (!match.instance_id && instanceId) {
              await supabase
                .from("inbox_conversations")
                .update({ instance_id: instanceId })
                .eq("id", match.id);
              conversation.instance_id = instanceId;
            }
          }
        }
      }

      // If conversation is closed and a new inbound message arrives, create a new ticket
      // EXCEPT when it's linked to a lead — in that case reopen instead of duplicating.
      if (conversation && conversation.status === 'closed' && !key.fromMe) {
        if (conversation.lead_id) {
          await supabase
            .from("inbox_conversations")
            .update({ status: 'open' })
            .eq("id", conversation.id);
          conversation.status = 'open';
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
            is_group: isGroup,
            status: 'pending_ai',
            last_message: content,
            unread_count: key.fromMe ? 0 : 1,
            instance_id: instanceId
          })
          .select()
          .single();
        if (convError) throw convError;
        conversation = newConv;
      } else {
        // Update existing conversation
        const updates: Record<string, unknown> = {
          last_message: content,
          unread_count: key.fromMe ? 0 : (conversation.unread_count || 0) + 1,
          updated_at: new Date().toISOString()
        };
        // Backfill the real phone number once we learn it (was keyed by LID before)
        if (pnDigits && conversation.contact_number !== pnDigits) {
          updates.contact_number = pnDigits;
        }
        // Record the LID so future LID-keyed messages match this same conversation
        if (lidDigits && conversation.contact_lid !== lidDigits) {
          updates.contact_lid = lidDigits;
        }
        // Keep the exact reply-to JID up to date (prefer real phone JID)
        if (contactJid && conversation.contact_jid !== contactJid) {
          updates.contact_jid = contactJid;
        }
        // Backfill the real contact name once the contact replies (when we only have the number)
        if (pushName && (!conversation.contact_name || conversation.contact_name === conversation.contact_number)) {
          updates.contact_name = pushName;
        }
        await supabase
          .from("inbox_conversations")
          .update(updates)
          .eq("id", conversation.id);
      }

      // 3. Download inbound media and store permanently in Supabase Storage
      // (the WhatsApp CDN URL is encrypted and short-lived — useless for display)
      let resolvedMediaUrl: string | null = null;
      if (type !== "text" && !key.fromMe) {
        console.log(`Processing inbound ${type} media for msg ${key.id}, mime=${mediaMimeType}`);
        const stored = await downloadAndStoreMedia(
          supabase, instanceName, payload, key, message, userId, key.id || crypto.randomUUID(), mediaMimeType
        );
        if (!stored) {
          console.error(`Failed to store ${type} media for msg ${key.id} — saving with null URL`);
        }
        resolvedMediaUrl = stored; // null if download failed → MediaBubble shows "indisponível"
      } else {
        resolvedMediaUrl = mediaUrl;
      }

      // 4. Save message to inbox_messages
      // Idempotent save: Evolution echoes outbound messages back via webhook,
      // and the client also inserts a row when sending from the CRM. Dedupe so
      // we never end up with two rows for the same message.
      let savedMsg: any = null;
      {
        // (a) Already saved this WA message id? Nothing to do.
        if (key.id) {
          const { data: existing } = await supabase
            .from("inbox_messages")
            .select("id")
            .eq("whatsapp_message_id", key.id)
            .maybeSingle();
          if (existing) {
            savedMsg = existing;
          }
        }

        // (b) For outbound (fromMe), look for a recent client-inserted row
        // with same body but no whatsapp_message_id and adopt it.
        if (!savedMsg && key.fromMe) {
          const sinceIso = new Date(Date.now() - 60_000).toISOString();
          const { data: pending } = await supabase
            .from("inbox_messages")
            .select("id, body")
            .eq("conversation_id", conversation.id)
            .eq("direction", "outbound")
            .is("whatsapp_message_id", null)
            .gte("timestamp", sinceIso)
            .order("timestamp", { ascending: false })
            .limit(5);
          const target = (pending || []).find(
            (r: any) => (r.body || "") === (content || ""),
          );
          if (target) {
            const { data: updated } = await supabase
              .from("inbox_messages")
              .update({
                whatsapp_message_id: key.id,
                media_url: resolvedMediaUrl,
                media_mime_type: mediaMimeType,
                media_filename: mediaFilename,
              })
              .eq("id", target.id)
              .select()
              .single();
            savedMsg = updated;
          }
        }

        // (c) Otherwise insert fresh.
        if (!savedMsg) {
          const { data: inserted, error: msgError } = await supabase
            .from("inbox_messages")
            .insert({
              conversation_id: conversation.id,
              user_id: userId,
              body: content || null,
              direction: key.fromMe ? 'outbound' : 'inbound',
              whatsapp_message_id: key.id,
              read: key.fromMe,
              type,
              media_url: resolvedMediaUrl,
              media_mime_type: mediaMimeType,
              media_filename: mediaFilename,
            })
            .select()
            .single();
          if (msgError) {
            // Unique violation on whatsapp_message_id = a concurrent insert
            // already saved this message; treat as success.
            if ((msgError as any).code !== "23505") throw msgError;
          } else {
            savedMsg = inserted;
          }
        }
      }

      // 5. Trigger logic for new inbound messages
      console.log(`[v2-keyword] Inbound check: fromMe=${key.fromMe}, isGroup=${isGroup}, convStatus=${conversation.status}, content="${content}"`);
      if (!key.fromMe && !isGroup) {
        // A. SEMPRE tenta vincular a conversa a um lead já existente (por número),
        //    mesmo sem palavra-chave — assim, se o lead já está no CRM, a mensagem
        //    cai dentro do mesmo lead em vez de ficar solta ou duplicar.
        if (!conversation.lead_id) {
          const { data: existingLeads } = await supabase
            .from("leads")
            .select("id, whatsapp")
            .eq("user_id", userId)
            .is("deleted_at", null);

          const inboundKey = whatsappMatchKey(whatsapp);
          const existingLead = inboundKey
            ? existingLeads?.find((lead) => whatsappMatchKey(lead.whatsapp) === inboundKey)
            : undefined;

          if (existingLead) {
            await supabase.from("inbox_conversations").update({ lead_id: existingLead.id }).eq("id", conversation.id);
            conversation.lead_id = existingLead.id;
          }
        }

        // B. Check for triggers → cria lead novo (Novo Lead) só se ainda não há
        //    lead vinculado (não existe um lead com esse número).
        const { data: triggers } = await supabase
          .from("inbox_triggers")
          .select("keyword")
          .eq("user_id", userId)
          .eq("active", true);

        const hasTrigger = triggers?.some(t => content.toLowerCase().includes(t.keyword.toLowerCase()));

        if (hasTrigger && !conversation.lead_id) {
          // Today's date in São Paulo timezone (YYYY-MM-DD)
          const todaySP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
          const { data: lead } = await supabase
            .from("leads")
            .insert({
              nome: conversation.contact_name || `Lead ${whatsapp}`,
              whatsapp: whatsapp,
              status: "Novo Lead",
              origem: "WhatsApp",
              data_contato: todaySP,
              user_id: userId
            })
            .select()
            .single();
          if (lead) {
            await supabase.from("inbox_conversations").update({ lead_id: lead.id }).eq("id", conversation.id);
            conversation.lead_id = lead.id;
          }
        }

        // B. Trigger AI if conversation still pending_ai
        if (conversation.status === 'pending_ai') {
          const { data: aiCfg } = await supabase
            .from("ai_config")
            .select("is_active, ai_trigger_enabled, ai_trigger_keywords")
            .eq("user_id", userId)
            .maybeSingle();

          // AI replies when: globally active, OR already enabled for this conversation
          let shouldReply = aiCfg?.is_active === true || conversation.ai_enabled === true;

          console.log(
            `AI trigger eval: is_active=${aiCfg?.is_active}, trigger_enabled=${aiCfg?.ai_trigger_enabled}, ` +
            `keywords=${JSON.stringify(aiCfg?.ai_trigger_keywords)}, content="${content}", conv.ai_enabled=${conversation.ai_enabled}`
          );

          // Keyword trigger: when global AI is off, start AI if the message contains a configured keyword/phrase
          if (!shouldReply && aiCfg?.ai_trigger_enabled && Array.isArray(aiCfg.ai_trigger_keywords) && aiCfg.ai_trigger_keywords.length > 0) {
            const text = normalizeText(content);
            const matchedKw = aiCfg.ai_trigger_keywords.find((kw: string) => {
              const nk = normalizeText(kw);
              return nk.length > 0 && text.includes(nk);
            });
            if (matchedKw) {
              await supabase.from("inbox_conversations").update({ ai_enabled: true }).eq("id", conversation.id);
              conversation.ai_enabled = true;
              shouldReply = true;
              console.log(`Keyword trigger matched ("${matchedKw}") → AI enabled for conv ${conversation.id}`);
            } else {
              console.log(`No keyword matched for content "${content}" (normalized: "${text}")`);
            }
          }

          if (shouldReply) {
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-reply`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ conversation_id: conversation.id })
            }).catch(err => console.error("Error triggering AI reply:", err));
          } else {
            console.log(`AI not triggered for conv ${conversation.id} (global off, no keyword match)`);
          }
        }
      }
    } else if (event === "connection.update") {
      const state = data.state;
      await supabase
        .from("whatsapp_instances")
        .update({ status: state === "open" ? "connected" : "disconnected" })
        .eq("name", instanceName);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
