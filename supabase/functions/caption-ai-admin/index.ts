import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Modelos de chat recomendados primeiro; o restante segue em ordem alfabética. */
const PREFERRED = ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini", "o4-mini"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Acesso restrito a administradores" }, 403);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ ok: false, error: "OPENAI_API_KEY não configurada" }, 200);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "list-models";

    if (action === "list-models") {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        return json({ ok: false, error: `OpenAI (${resp.status}): ${text.slice(0, 200)}` }, 200);
      }
      const data = await resp.json();
      const ids: string[] = (data?.data ?? [])
        .map((m: any) => m?.id)
        .filter((id: string) =>
          typeof id === "string" &&
          /^(gpt-|o\d|chatgpt-)/.test(id) &&
          !/(audio|realtime|transcribe|tts|image|search|embedding|moderation|instruct)/.test(id)
        );
      const unique = Array.from(new Set(ids));
      const top = PREFERRED.filter((p) => unique.includes(p));
      const rest = unique.filter((id) => !top.includes(id)).sort();
      return json({ ok: true, models: [...top, ...rest] });
    }

    if (action === "test") {
      const model = (body.model ?? "gpt-4o").toString();
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                'Responda SOMENTE com JSON no formato {"caption":"..."} com uma frase curta e sensível sobre um ensaio fotográfico. Não use travessões.',
            },
            { role: "user", content: "Gere um exemplo curto." },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const text = await resp.text();
      if (!resp.ok) return json({ ok: false, error: `OpenAI (${resp.status}): ${text.slice(0, 300)}` }, 200);
      let sample = "";
      try {
        const parsed = JSON.parse(text);
        const content = parsed?.choices?.[0]?.message?.content ?? "";
        sample = (JSON.parse(content)?.caption ?? content).toString();
      } catch {
        sample = "Resposta recebida.";
      }
      return json({ ok: true, sample });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("caption-ai-admin error:", err);
    return json({ ok: false, error: (err as Error)?.message ?? "Erro inesperado" }, 200);
  }
});
