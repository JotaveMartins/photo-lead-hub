 import "jsr:@supabase/functions-js/edge-runtime.d.ts";
 import { createClient } from "npm:@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };

// Transcribe an audio file (URL) to text using Whisper (OpenAI/Groq) or the Lovable gateway.
async function transcribeAudio(mediaUrl: string, provider: string, apiKey: string | null): Promise<string | null> {
  try {
    let url: string;
    let key: string;
    let model: string;
    if (provider === "groq" && apiKey) {
      url = "https://api.groq.com/openai/v1/audio/transcriptions";
      key = apiKey;
      model = "whisper-large-v3";
    } else if (provider === "openai" && apiKey) {
      url = "https://api.openai.com/v1/audio/transcriptions";
      key = apiKey;
      model = "whisper-1";
    } else {
      // Fallback: try OpenAI key from secrets, otherwise give up
      const envKey = Deno.env.get("OPENAI_API_KEY");
      if (!envKey) {
        console.log("No transcription provider available (provider=" + provider + ")");
        return null;
      }
      url = "https://api.openai.com/v1/audio/transcriptions";
      key = envKey;
      model = "whisper-1";
    }

    const audioResp = await fetch(mediaUrl);
    if (!audioResp.ok) {
      console.error("Failed to fetch audio for transcription:", audioResp.status);
      return null;
    }
    const audioBlob = await audioResp.blob();
    const form = new FormData();
    form.append("file", audioBlob, "audio.ogg");
    form.append("model", model);
    form.append("language", "pt");

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}` },
      body: form,
    });
    if (!resp.ok) {
      console.error("Transcription API error:", resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const result = await resp.json();
    return (result?.text || "").trim() || null;
  } catch (err) {
    console.error("transcribeAudio error:", err);
    return null;
  }
}

 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
 
   try {
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     const { lead_id, conversation_id } = await req.json();

     let userId: string | null = null;
     let phoneNumber: string | null = null;
     let conv: any = null;

     if (conversation_id) {
       const { data } = await supabase.from("inbox_conversations").select("*").eq("id", conversation_id).single();
       if (!data) throw new Error("Conversation not found");
       conv = data;
       if (conv.status !== "pending_ai") {
         return new Response(JSON.stringify({ skipped: "not pending_ai" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
       }
       userId = conv.user_id;
       phoneNumber = conv.contact_number;
     } else if (lead_id) {
       const { data: lead } = await supabase.from("leads").select("*").eq("id", lead_id).single();
       if (!lead) throw new Error("Lead not found");
       if (lead.ai_paused) return new Response(JSON.stringify({ message: "AI paused" }), { headers: corsHeaders });
       userId = lead.user_id;
       phoneNumber = lead.whatsapp;
     } else {
       throw new Error("lead_id or conversation_id required");
     }

     const { data: aiConfig } = await supabase.from("ai_config").select("*").eq("user_id", userId).maybeSingle();
     if (!aiConfig) throw new Error("AI config not found");
     // Skip if AI is globally disabled and not manually enabled for this conversation
     if (!aiConfig.is_active && !conv?.ai_enabled) {
       return new Response(JSON.stringify({ skipped: "ai_not_active" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
     }

     // Build history
     let chatHistory: any[] = [];
     if (conv) {
       const { data: msgs } = await supabase.from("inbox_messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(20);
       const ordered = (msgs || []).reverse();
       for (const m of ordered) {
         let text = m.body || "";
         // Transcribe inbound voice messages so the AI understands them
         if (m.type === "audio" && m.media_url && !text && m.direction === "inbound") {
           const transcript = await transcribeAudio(m.media_url, aiConfig.provider || "lovable", aiConfig.api_key);
           if (transcript) {
             text = transcript;
             // Cache the transcription so we don't transcribe the same audio again
             await supabase.from("inbox_messages").update({ body: transcript }).eq("id", m.id);
             console.log(`Transcribed audio ${m.id}: "${transcript.slice(0, 80)}"`);
           } else {
             text = "[o cliente enviou um áudio, mas não foi possível transcrever]";
           }
         }
         chatHistory.push({ role: m.direction === "inbound" ? "user" : "assistant", content: text });
       }
     } else {
       const { data: msgs } = await supabase.from("messages").select("*").eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(20);
       chatHistory = (msgs || []).reverse().map(m => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.content || "" }));
     }

     // Call AI - support Lovable AI Gateway as default fallback
     let aiResponse = "";
     const provider = aiConfig.provider || "lovable";
     let url = "";
     let apiKey = aiConfig.api_key;
     let model = aiConfig.model;

     if (provider === "lovable" || !apiKey) {
       url = "https://ai.gateway.lovable.dev/v1/chat/completions";
       apiKey = Deno.env.get("LOVABLE_API_KEY")!;
       if (!model || model.startsWith("gpt-")) model = "google/gemini-2.5-flash";
     } else if (provider === "openai") {
       url = "https://api.openai.com/v1/chat/completions";
     } else if (provider === "groq") {
       url = "https://api.groq.com/openai/v1/chat/completions";
     } else {
       url = "https://ai.gateway.lovable.dev/v1/chat/completions";
       apiKey = Deno.env.get("LOVABLE_API_KEY")!;
     }

     const response = await fetch(url, {
       method: "POST",
       headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
       body: JSON.stringify({
         model,
         messages: [{ role: "system", content: [aiConfig.system_prompt || "", aiConfig.knowledge_base ? `\n\n---\nInformações sobre o fotógrafo/estúdio:\n${aiConfig.knowledge_base}` : ""].join("") }, ...chatHistory],
         temperature: aiConfig.temperature,
         max_tokens: aiConfig.max_tokens
       })
     });
     const result = await response.json();
     aiResponse = result?.choices?.[0]?.message?.content || "";
     if (!aiResponse) throw new Error("AI returned empty response: " + JSON.stringify(result).slice(0, 300));

     // Strip commands
     aiResponse = aiResponse.replace(/\[ENVIAR_ARQUIVO:\s*[a-f0-9-]{36}\]/gi, "").replace(/\[TRIAGEM_FEITA\]/g, "").trim();

     // Find active instance
     const { data: instanceData } = await supabase.from("whatsapp_instances").select("id").eq("user_id", userId).eq("status", "connected").maybeSingle();
     const instanceId = instanceData?.id;
     if (!instanceId) throw new Error("No WhatsApp instance available");

     // Send via WhatsApp
     await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-message`, {
       method: "POST",
       headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`, "Content-Type": "application/json" },
       body: JSON.stringify({ lead_id: lead_id || null, phone_number: phoneNumber, instance_id: instanceId, type: "text", content: aiResponse, sent_by: "ai" })
     });

     // Save assistant reply to inbox_messages for visibility
     if (conv) {
       await supabase.from("inbox_messages").insert({
         conversation_id: conv.id, user_id: userId, body: aiResponse, direction: "outbound", read: true
       });
       await supabase.from("inbox_conversations").update({ last_message: aiResponse, updated_at: new Date().toISOString() }).eq("id", conv.id);
     }

     return new Response(JSON.stringify({ success: true, reply: aiResponse }), {
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