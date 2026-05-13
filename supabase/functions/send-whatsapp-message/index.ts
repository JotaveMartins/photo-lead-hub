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
 
     const { lead_id, instance_id, type, content, media_base64, media_filename, media_mime_type, sent_by = 'ai' } = await req.json();
 
     // 1. Get instance details
     const { data: instance, error: instError } = await supabase
       .from("whatsapp_instances")
       .select("*")
       .eq("id", instance_id)
       .single();
 
     if (instError || !instance) throw new Error("Instance not found");
 
     // 2. Get lead details
     const { data: lead, error: leadError } = await supabase
       .from("leads")
       .select("*")
       .eq("id", lead_id)
       .single();
 
     if (leadError || !lead) throw new Error("Lead not found");
 
     const remoteJid = lead.whatsapp.includes('@') ? lead.whatsapp : `${lead.whatsapp}@s.whatsapp.net`;
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
     const response = await fetch(`${instance.base_url}${endpoint}`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "apikey": instance.api_key
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