import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { event, data, instance: instanceName } = payload;

    // Find the user_id associated with this instance
    const { data: instanceData } = await supabase
      .from("whatsapp_instances")
      .select("user_id")
      .eq("name", instanceName)
      .maybeSingle();

    const userId = instanceData?.user_id;
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
      const whatsapp = remoteJid.split("@")[0];
      const isGroup = remoteJid.endsWith("@g.us");
      const pushName = data.pushName || "";

      // 1. Determine message content
      let type = "text";
      let content = "";
      if (message.conversation) content = message.conversation;
      else if (message.extendedTextMessage) content = message.extendedTextMessage.text;
      else if (message.imageMessage) { type = "image"; content = message.imageMessage.caption || ""; }
      else if (message.audioMessage) type = "audio";
      else if (message.videoMessage) { type = "video"; content = message.videoMessage.caption || ""; }
      else if (message.documentMessage) type = "document";

      // 2. Find or create inbox conversation
      let { data: conversation } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("contact_number", whatsapp)
        .maybeSingle();

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
            unread_count: key.fromMe ? 0 : 1
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
          body: content,
          direction: key.fromMe ? 'outbound' : 'inbound',
          whatsapp_message_id: key.id,
          read: key.fromMe
        })
        .select()
        .single();
      if (msgError) throw msgError;

      // 4. Trigger logic for new inbound messages
      if (!key.fromMe) {
        // A. Check for triggers (Auto-create lead)
        const { data: triggers } = await supabase
          .from("inbox_triggers")
          .select("keyword")
          .eq("user_id", userId)
          .eq("active", true);

        const hasTrigger = triggers?.some(t => content.toLowerCase().includes(t.keyword.toLowerCase()));
        
        if (hasTrigger && !conversation.lead_id) {
          // Create Lead
          const { data: lead } = await supabase
            .from("leads")
            .insert({
              nome: conversation.contact_name || `Lead ${whatsapp}`,
              whatsapp: whatsapp,
              status: "Contato Iniciado",
              origem: "WhatsApp Inbox",
              user_id: userId
            })
            .select()
            .single();
          
          if (lead) {
            await supabase
              .from("inbox_conversations")
              .update({ lead_id: lead.id })
              .eq("id", conversation.id);
          }
        }

        // B. Trigger AI if status is pending_ai
        if (conversation.status === 'pending_ai') {
          // Trigger ai-reply (we'll need to adapt ai-reply or create a new one for inbox)
          // For now, let's keep it simple and just log or use existing if compatible
          // Existing ai-reply uses lead_id, so we need a lead_id if possible
          if (conversation.lead_id) {
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-reply`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ lead_id: conversation.lead_id, message_id: savedMsg.id })
            }).catch(err => console.error("Error triggering AI reply:", err));
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
