import { createClient } from "npm:@supabase/supabase-js@2";
import { ANALYSIS_PROMPT, prepareSample, validateReport, type SampleConversation } from "./report.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Entre no CRM para gerar a análise." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.entry_message !== "string" || body.entry_message.trim().length < 3 || body.entry_message.length > 1000) {
      return json({ error: "Informe a mensagem de entrada, entre 3 e 1.000 caracteres." }, 400);
    }
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const targetUserId = body.target_user_id ?? user.id;
    if (typeof targetUserId !== "string" || !/^[0-9a-f-]{36}$/i.test(targetUserId)) return json({ error: "Conta inválida." }, 400);
    if (targetUserId !== user.id) {
      const { data: isAdmin, error } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error || !isAdmin) return json({ error: "Você não pode analisar atendimentos de outra conta." }, 403);
    }
    const { data, error } = await admin.rpc("get_inbox_analysis_sample", {
      p_user_id: targetUserId, p_entry_message: body.entry_message.trim(),
    });
    if (error) return json({ error: "Não foi possível selecionar os atendimentos. Verifique se a migração da análise foi aplicada." }, 500);
    const conversations = data as SampleConversation[];
    if (!Array.isArray(conversations) || !conversations.length) {
      return json({ error: "Nenhuma conversa começa com essa mensagem. Confira o texto e a pontuação." }, 404);
    }
    if (conversations.length > 20 || conversations.some((conversation) => conversation.messages.length > 1000)) {
      return json({ error: "A amostra contém um atendimento muito extenso. A análise não foi gerada para evitar um relatório incompleto." }, 413);
    }
    const sample = prepareSample(conversations);
    const serialized = JSON.stringify(sample);
    if (serialized.length > 180_000) return json({ error: "Os históricos são extensos demais para uma única análise. Nenhuma mensagem foi omitida silenciosamente." }, 413);

    const { data: config, error: configError } = await admin.from("app_settings").select("value").eq("key", "caption_ai").maybeSingle();
    if (configError) return json({ error: "Não foi possível carregar a configuração de IA do CRM." }, 500);
    const settings = (config?.value ?? {}) as { provider?: string; openai_model?: string };
    const useOpenAI = settings.provider === "openai";
    const key = Deno.env.get(useOpenAI ? "OPENAI_API_KEY" : "LOVABLE_API_KEY");
    if (!key) return json({ error: "A chave do provedor de IA configurado no CRM não está disponível no backend." }, 503);
    const response = await fetch(useOpenAI ? "https://api.openai.com/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", signal: AbortSignal.timeout(90_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: useOpenAI ? (settings.openai_model || "gpt-4o") : "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: ANALYSIS_PROMPT }, { role: "user", content: serialized }],
      }),
    });
    if (!response.ok) {
      const message = response.status === 429 ? "Limite de requisições da IA atingido. Tente novamente em instantes."
        : response.status === 402 ? "O provedor de IA está sem créditos. Verifique o saldo antes de tentar novamente."
        : "O provedor de IA não conseguiu concluir a análise. Tente novamente.";
      return json({ error: message }, response.status === 429 || response.status === 402 ? response.status : 502);
    }
    const completion = await response.json();
    const raw = completion?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.length > 50_000) throw new Error("A IA não retornou uma análise válida. Tente novamente.");
    const report = validateReport(JSON.parse(raw), sample.map((conversation) => conversation.conversation));
    return json({
      report, sample: {
        conversationCount: sample.length,
        messageCount: sample.reduce((sum, conversation) => sum + conversation.messages.length, 0),
        untranscribedMediaCount: sample.reduce((sum, conversation) => sum + conversation.messages.filter((message) => message.type !== "text").length, 0),
        contacts: sample.map(({ conversation, name, phone }) => ({ conversation, name, phone })),
        entryMessage: body.entry_message.trim(), generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Do not log histories, tokens or provider responses.
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return json({ error: timeout ? "A análise demorou mais que o esperado. Tente novamente." : "Não foi possível concluir uma análise válida. Tente novamente." }, 500);
  }
});
