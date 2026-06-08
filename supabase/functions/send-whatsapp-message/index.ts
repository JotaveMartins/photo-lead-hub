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
 
    const { lead_id, phone_number, jid, instance_id, type, content, media_base64, media_filename, media_mime_type, sent_by = 'ai' } = await req.json();

    // 1. Get instance details
    const { data: instance, error: instError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instance_id)
      .single();

    if (instError || !instance) throw new Error("Instance not found");

    let remoteJid = "";

    // 2. Get target identifier
    // Prefer the exact JID captured from WhatsApp (handles @lid contacts on newer versions)
    if (jid && String(jid).includes('@')) {
      remoteJid = jid;
    } else if (lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();

      if (leadError || !lead) throw new Error("Lead not found");
      remoteJid = lead.whatsapp.includes('@') ? lead.whatsapp : `${lead.whatsapp}@s.whatsapp.net`;
    } else if (phone_number) {
      remoteJid = phone_number.includes('@') ? phone_number : `${phone_number}@s.whatsapp.net`;
    } else {
      throw new Error("Either lead_id, phone_number or jid must be provided");
    }

    let endpoint = "";
    let body: any = { number: remoteJid };
 
     if (type === "text") {
       endpoint = `/message/sendText/${instance.name}`;
       body.text = content;
     } else if (type === "audio") {
       endpoint = `/message/sendWhatsAppAudio/${instance.name}`;
       body.audio = media_base64;
     } else {
       endpoint = `/message/sendMedia/${instance.name}`;
       body.media = media_base64;
       body.mediatype = type; // image, video, document
       if (media_filename) body.fileName = media_filename;
       if (content) body.caption = content;
     }
 
    // 3. Send to Evolution API
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "evolution")
      .maybeSingle();
    const settings: any = settingsRow?.value || {};
    const finalBaseUrl = (instance.base_url || settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const finalApiKey = instance.api_key || settings.api_key || Deno.env.get("EVOLUTION_API_KEY");

    if (!finalBaseUrl || !finalApiKey) {
      throw new Error("Evolution API not configured (Base URL or API Key missing)");
    }

    const response = await fetch(`${finalBaseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": finalApiKey
      },
      body: JSON.stringify(body)
    });
 
     const result = await response.json();
     if (!response.ok) throw new Error(`Evolution API error: ${JSON.stringify(result)}`);
 
     // 4. Save outbound message
     const { error: msgError } = await supabase
       .from("messages")
       .insert({
         lead_id,
         instance_id,
         direction: "outbound",
         type,
         content,
         media_url: result.mediaUrl || null, // If API returns a URL
         media_mime_type,
         media_filename,
         whatsapp_message_id: result.key?.id || result.messageId,
         sent_by,
         status: "sent"
       });
 
     if (msgError) console.error("Error saving outbound message:", msgError);
 
     return new Response(JSON.stringify({ success: true, result }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" }
     });
   } catch (err) {
     return new Response(JSON.stringify({ error: err.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" }
     });
   }
 });