import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { provider, api_key, model } = await req.json();
    if (!provider || !api_key) {
      return new Response(JSON.stringify({ ok: false, error: "provider e api_key são obrigatórios" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ok = false;
    let error = "";

    if (provider === "openai" || provider === "groq") {
      const baseUrl = provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const testModel = model || (provider === "groq" ? "llama-3.1-8b-instant" : "gpt-4o-mini");
      const resp = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      ok = resp.ok;
      if (!ok) {
        const body = await resp.json().catch(() => ({}));
        error = body?.error?.message || `Status ${resp.status}`;
      }
    } else if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model || "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      ok = resp.ok;
      if (!ok) {
        const body = await resp.json().catch(() => ({}));
        error = body?.error?.message || `Status ${resp.status}`;
      }
    } else if (provider === "gemini") {
      const testModel = model || "gemini-2.0-flash";
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }], generationConfig: { maxOutputTokens: 1 } }),
        }
      );
      ok = resp.ok;
      if (!ok) {
        const body = await resp.json().catch(() => ({}));
        error = body?.error?.message || `Status ${resp.status}`;
      }
    } else {
      error = "Provedor não suportado";
    }

    return new Response(JSON.stringify({ ok, error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
