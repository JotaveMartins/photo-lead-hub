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
       if (!key.fromMe) {
         const remoteJid = key.remoteJid;
         const whatsapp = remoteJid.split("@")[0];
 
         // 1. Find or create lead
         let { data: lead, error: leadError } = await supabase
           .from("leads")
           .select("*")
           .eq("whatsapp", whatsapp)
           .is("deleted_at", null)
           .single();
 
         if (!lead) {
           const { data: newLead, error: createError } = await supabase
             .from("leads")
             .insert({
               nome: `Lead +${whatsapp}`,
               whatsapp,
               status: "Novo Lead",
               origem: "WhatsApp",
               data_contato: new Date().toISOString().split('T')[0],
               user_id: userId
             })
             .select()
             .single();
           if (createError) throw createError;
           lead = newLead;
         }
 
         // 2. Determine message content
         let type = "text";
         let content = "";
         let mediaUrl = null;
 
         if (message.conversation) {
           content = message.conversation;
         } else if (message.extendedTextMessage) {
           content = message.extendedTextMessage.text;
         } else if (message.imageMessage) {
           type = "image";
           content = message.imageMessage.caption || "";
         } else if (message.audioMessage) {
           type = "audio";
         } else if (message.videoMessage) {
           type = "video";
           content = message.videoMessage.caption || "";
         } else if (message.documentMessage) {
           type = "document";
         }
 
         // 3. Save message
         const { data: savedMsg, error: msgError } = await supabase
           .from("messages")
           .insert({
             lead_id: lead.id,
             direction: "inbound",
             type,
             content,
             whatsapp_message_id: key.id,
             status: "received"
           })
           .select()
           .single();
 
         if (msgError) throw msgError;
 
         // 4. Update lead last message
         await supabase.from("leads").update({
           last_message_at: new Date().toISOString(),
           unread_count: (lead.unread_count || 0) + 1
         }).eq("id", lead.id);
 
         // 5. Trigger AI reply if not paused
         if (!lead.ai_paused) {
           fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-reply`, {
             method: "POST",
             headers: {
               "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
               "Content-Type": "application/json"
             },
             body: JSON.stringify({ lead_id: lead.id, message_id: savedMsg.id })
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