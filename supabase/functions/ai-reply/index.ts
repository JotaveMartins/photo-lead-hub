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
 
     const { lead_id, message_id } = await req.json();
 
     // 1. Get lead and active instance
     const { data: lead, error: leadError } = await supabase
       .from("leads")
       .select("*, whatsapp_instances(*)")
       .eq("id", lead_id)
       .single();
 
     if (leadError || !lead) throw new Error("Lead not found");
     if (lead.ai_paused) return new Response(JSON.stringify({ message: "AI paused for this lead" }), { headers: corsHeaders });
 
      // Get active config for this specific lead's user
      const { data: aiConfig, error: configError } = await supabase
        .from("ai_config")
        .select("*")
        .eq("user_id", lead.user_id)
        .eq("is_active", true)
        .maybeSingle();
 
     if (configError || !aiConfig) throw new Error("Active AI config not found");
 
     // 2. Build history
     const { data: messages, error: msgsError } = await supabase
       .from("messages")
       .select("*")
       .eq("lead_id", lead_id)
       .order("created_at", { ascending: false })
       .limit(20);
 
     if (msgsError) throw msgsError;
 
     const chatHistory = messages.reverse().map(m => ({
       role: m.direction === "inbound" ? "user" : "assistant",
       content: m.content || ""
     }));
 
     // 3. Call AI Provider
     let aiResponse = "";
     if (aiConfig.provider === "openai" || aiConfig.provider === "groq") {
       const url = aiConfig.provider === "openai" 
         ? "https://api.openai.com/v1/chat/completions"
         : "https://api.groq.com/openai/v1/chat/completions";
       
       const response = await fetch(url, {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${aiConfig.api_key}`,
           "Content-Type": "application/json"
         },
         body: JSON.stringify({
           model: aiConfig.model,
           messages: [
             { role: "system", content: aiConfig.system_prompt },
             ...chatHistory
           ],
           temperature: aiConfig.temperature,
           max_tokens: aiConfig.max_tokens
         })
       });
       const result = await response.json();
       aiResponse = result.choices[0].message.content;
     }
     // Add Anthropic/Gemini logic as needed...
 
     // 4. Handle commands ([ENVIAR_ARQUIVO: uuid], [TRIAGEM_FEITA])
     let fileToSend = null;
     const fileMatch = aiResponse.match(/\[ENVIAR_ARQUIVO:\s*([a-f0-9-]{36})\]/i);
     if (fileMatch) {
       const fileId = fileMatch[1];
       const { data: file } = await supabase.from("ai_files").select("*").eq("id", fileId).single();
       if (file) fileToSend = file;
       aiResponse = aiResponse.replace(fileMatch[0], "").trim();
     }
 
     const triagemFeita = aiResponse.includes("[TRIAGEM_FEITA]");
     if (triagemFeita) {
       aiResponse = aiResponse.replace("[TRIAGEM_FEITA]", "").trim();
       // Simple extraction logic or let a second LLM pass handle structured data extraction
       await supabase.from("leads").update({
         status: "Triagem Feita",
         triagem_at: new Date().toISOString()
       }).eq("id", lead_id);
     }
 
     // 5. Send message via WhatsApp
      // Find an active instance for this user
      const { data: instanceData } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("user_id", lead.user_id)
        .eq("status", "connected")
        .maybeSingle();

      const instanceId = lead.whatsapp_instance_id || instanceData?.id;
 
     if (!instanceId) throw new Error("No WhatsApp instance available");
 
     await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
         "Content-Type": "application/json"
       },
       body: JSON.stringify({
         lead_id,
         instance_id: instanceId,
         type: "text",
         content: aiResponse,
         sent_by: "ai"
       })
     });
 
     if (fileToSend) {
       // Send file...
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