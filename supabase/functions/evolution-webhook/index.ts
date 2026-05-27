import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const normalizeWhatsApp = (value: string | null | undefined) => String(value || "").replace(/\D/g, "");

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
      const whatsapp = normalizeWhatsApp(remoteJid.split("@")[0]);
      const isGroup = remoteJid.endsWith("@g.us");
      
      if (isGroup) {
        console.log("Skipping group message:", remoteJid);
        return new Response(JSON.stringify({ success: true, message: "Group message ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      const pushName = data.pushName || "";

      // 1. Determine message content
      let type = "text";
      let content = "";
      let mediaUrl: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;
      if (message.conversation) content = message.conversation;
      else if (message.extendedTextMessage) content = message.extendedTextMessage.text;
      else if (message.imageMessage) {
        type = "image";
        content = message.imageMessage.caption || "";
        mediaMimeType = message.imageMessage.mimetype || "image/jpeg";
        mediaUrl = message.imageMessage.url || null;
      }
      else if (message.audioMessage) {
        type = "audio";
        mediaMimeType = message.audioMessage.mimetype || "audio/ogg";
        mediaUrl = message.audioMessage.url || null;
      }
      else if (message.videoMessage) {
        type = "video";
        content = message.videoMessage.caption || "";
        mediaMimeType = message.videoMessage.mimetype || "video/mp4";
        mediaUrl = message.videoMessage.url || null;
      }
      else if (message.documentMessage) {
        type = "document";
        content = message.documentMessage.caption || message.documentMessage.fileName || "";
        mediaMimeType = message.documentMessage.mimetype || null;
        mediaFilename = message.documentMessage.fileName || null;
        mediaUrl = message.documentMessage.url || null;
      }
      else if (message.stickerMessage) {
        type = "image";
        mediaUrl = message.stickerMessage.url || null;
        mediaMimeType = message.stickerMessage.mimetype || "image/webp";
      }

      // 2. Find or create inbox conversation
      let { data: conversation } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("contact_number", whatsapp)
        .eq("instance_id", instanceId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // If conversation is closed and a new inbound message arrives, create a new ticket
      if (conversation && conversation.status === 'closed' && !key.fromMe) {
        conversation = null;
      }

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("inbox_conversations")
          .insert({
            user_id: userId,
            contact_number: whatsapp,
            contact_name: pushName || whatsapp,
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
        await supabase
          .from("inbox_conversations")
          .update({
            last_message: content,
            unread_count: key.fromMe ? 0 : (conversation.unread_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", conversation.id);
      }

      // 3. Save message to inbox_messages
      const { data: savedMsg, error: msgError } = await supabase
        .from("inbox_messages")
        .insert({
          conversation_id: conversation.id,
          user_id: userId,
          body: content || null,
          direction: key.fromMe ? 'outbound' : 'inbound',
          whatsapp_message_id: key.id,
          read: key.fromMe,
          type,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          media_filename: mediaFilename,
        })
        .select()
        .single();
      if (msgError) throw msgError;

      // 4. Trigger logic for new inbound messages
      if (!key.fromMe && !isGroup) {
        // A. Check for triggers → auto-create lead (Novo Lead)
        const { data: triggers } = await supabase
          .from("inbox_triggers")
          .select("keyword")
          .eq("user_id", userId)
          .eq("active", true);

        const hasTrigger = triggers?.some(t => content.toLowerCase().includes(t.keyword.toLowerCase()));

        if (hasTrigger) {
          // Check if a lead with this number already exists for this user
          const { data: existingLeads } = await supabase
            .from("leads")
            .select("id, whatsapp")
            .eq("user_id", userId)
            .is("deleted_at", null);

          const existingLead = existingLeads?.find((lead) => {
            const current = normalizeWhatsApp(lead.whatsapp);
            return current === whatsapp || current.endsWith(whatsapp) || whatsapp.endsWith(current);
          });

          if (!existingLead) {
            const { data: lead } = await supabase
              .from("leads")
              .insert({
                nome: conversation.contact_name || `Lead ${whatsapp}`,
                whatsapp: whatsapp,
                status: "Novo Lead",
                origem: "WhatsApp Inbox",
                user_id: userId
              })
              .select()
              .single();
            if (lead) {
              await supabase.from("inbox_conversations").update({ lead_id: lead.id }).eq("id", conversation.id);
              conversation.lead_id = lead.id;
            }
          } else if (!conversation.lead_id) {
            // If lead exists but conversation is not linked, link it
            await supabase.from("inbox_conversations").update({ lead_id: existingLead.id }).eq("id", conversation.id);
            conversation.lead_id = existingLead.id;
          }
        }

        // B. Trigger AI if conversation still pending_ai
        if (conversation.status === 'pending_ai') {
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-reply`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ conversation_id: conversation.id })
          }).catch(err => console.error("Error triggering AI reply:", err));
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
