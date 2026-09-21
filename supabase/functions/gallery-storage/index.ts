// Camada de armazenamento das galerias (preparada para Cloudflare R2).
// As credenciais do R2 vivem apenas aqui, nunca no frontend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const r2Config = () => ({
  accountId: Deno.env.get("R2_ACCOUNT_ID") ?? "",
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
  bucket: Deno.env.get("R2_BUCKET_NAME") ?? "",
  publicBaseUrl: Deno.env.get("R2_PUBLIC_BASE_URL") ?? "",
});

const isConfigured = () => {
  const c = r2Config();
  return !!(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    // Toda ação exige que a galeria pertença ao usuário autenticado (RLS + checagem explícita).
    if (body?.galleryId) {
      const { data: gallery } = await supabase
        .from("galleries")
        .select("id, user_id")
        .eq("id", body.galleryId)
        .maybeSingle();
      if (!gallery || gallery.user_id !== user.id) {
        return json({ error: "Galeria não encontrada" }, 403);
      }
    }

    if (!isConfigured()) {
      return json(
        {
          error:
            "Armazenamento de fotos ainda não configurado. Informe as credenciais do Cloudflare R2 para habilitar envios.",
          configured: false,
          action,
        },
        503,
      );
    }

    // Implementação real das URLs assinadas será adicionada quando as credenciais existirem.
    return json({ error: "Ação não implementada nesta etapa", action }, 501);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
