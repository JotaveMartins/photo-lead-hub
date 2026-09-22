// Galeria pública (cliente final). Sem autenticação: valida status, expiração e senha
// no backend e devolve apenas URLs assinadas temporárias. O bucket R2 segue privado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ENDPOINT = (Deno.env.get("R2_ENDPOINT") ?? "").replace(/\/+$/, "");
const BUCKET = Deno.env.get("R2_BUCKET_NAME") ?? "";
const ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
const SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
const REGION = Deno.env.get("R2_REGION") ?? "auto";
const TOKEN_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const aws = () =>
  new AwsClient({ accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY, service: "s3", region: REGION });

const objectUrl = (key: string) =>
  `${ENDPOINT}/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

const presign = async (key: string, expiresIn: number, downloadName?: string) => {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  if (downloadName) {
    url.searchParams.set("response-content-disposition", `attachment; filename="${downloadName}"`);
  }
  const signed = await aws().sign(new Request(url.toString(), { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
};

// Token de sessão da galeria (HMAC), usado após validar a senha.
const enc = new TextEncoder();
const hmacKey = () =>
  crypto.subtle.importKey("raw", enc.encode(TOKEN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);

const b64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const signToken = async (galleryId: string) => {
  const exp = Date.now() + 12 * 3600_000;
  const payload = `${galleryId}.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload));
  return `${payload}.${b64(sig)}`;
};

const verifyToken = async (token: string | undefined, galleryId: string) => {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts;
  if (id !== galleryId || Number(exp) < Date.now()) return false;
  const expected = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(`${id}.${exp}`));
  return b64(expected) === sig;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "get");
    const slug = String(body?.slug ?? "");
    if (!slug) return json({ error: "Galeria não encontrada", state: "not_found" }, 404);

    const { data: gallery } = await admin
      .from("galleries")
      .select(
        "id, user_id, name, slug, status, event_date, expires_at, password_hash, cover_media_id, download_enabled, media_count",
      )
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (!gallery) return json({ state: "not_found" }, 404);

    // Modo pré-visualização: dono autenticado enxerga rascunho e ignora senha.
    let isOwner = false;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await anon.auth.getUser();
      if (u?.user?.id === gallery.user_id) isOwner = true;
    }

    if (!isOwner) {
      if (gallery.status !== "published") return json({ state: "unavailable" }, 200);
      if (gallery.expires_at && new Date(gallery.expires_at).getTime() < Date.now()) {
        return json({ state: "expired" }, 200);
      }
    }

    // Senha
    let authorized = isOwner || !gallery.password_hash;
    let token: string | null = null;

    if (!authorized) {
      if (await verifyToken(body?.token, gallery.id)) {
        authorized = true;
        token = body.token;
      } else if (body?.password) {
        const { data: ok } = await admin.rpc("verify_gallery_password", {
          _gallery_id: gallery.id,
          _password: String(body.password),
        });
        if (!ok) return json({ state: "password", error: "Senha incorreta." }, 200);
        authorized = true;
        token = await signToken(gallery.id);
      }
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("nome, avatar_url")
      .eq("user_id", gallery.user_id)
      .maybeSingle();

    const photographer = {
      nome: (profile as any)?.nome ?? null,
      logo: (profile as any)?.avatar_url ?? null,
    };

    if (!authorized) {
      return json({ state: "password", gallery: { name: gallery.name }, photographer });
    }

    // Identificação da sessão do visitante (gerada no cliente, aleatória).
    const visitorId = String(body?.visitorId ?? "").slice(0, 64);
    const validVisitor = /^[A-Za-z0-9_-]{16,64}$/.test(visitorId);

    if (action === "favorite") {
      if (!validVisitor) return json({ error: "Sessão inválida" }, 400);
      if (!isOwner && gallery.status !== "published") return json({ error: "Galeria indisponível" }, 403);
      const mediaId = String(body?.mediaId ?? "");
      const { data: m } = await admin
        .from("gallery_media")
        .select("id")
        .eq("gallery_id", gallery.id)
        .eq("id", mediaId)
        .maybeSingle();
      if (!m) return json({ error: "Foto não encontrada" }, 404);

      if (body?.favorite === false) {
        await admin
          .from("gallery_favorites")
          .delete()
          .eq("gallery_id", gallery.id)
          .eq("media_id", mediaId)
          .eq("visitor_session_id", visitorId);
        return json({ ok: true, favorite: false });
      }
      const { error: insErr } = await admin
        .from("gallery_favorites")
        .upsert(
          { gallery_id: gallery.id, media_id: mediaId, visitor_session_id: visitorId },
          { onConflict: "gallery_id,media_id,visitor_session_id", ignoreDuplicates: true },
        );
      if (insErr) return json({ error: insErr.message }, 400);
      return json({ ok: true, favorite: true });
    }

    if (action === "download") {
      if (!gallery.download_enabled) return json({ error: "Download não permitido" }, 403);
      const { data: m } = await admin
        .from("gallery_media")
        .select("id, filename, original_key")
        .eq("gallery_id", gallery.id)
        .eq("id", String(body?.mediaId ?? ""))
        .maybeSingle();
      if (!m?.original_key) return json({ error: "Foto não encontrada" }, 404);
      return json({ url: await presign(m.original_key, 600, m.filename ?? "foto.jpg") });
    }

    const [{ data: sections }, { data: mediaRows }] = await Promise.all([
      admin.from("gallery_sections").select("id, name, sort_order").eq("gallery_id", gallery.id).order("sort_order"),
      admin
        .from("gallery_media")
        .select("id, section_id, filename, width, height, sort_order, processing_status, original_key, preview_key, thumbnail_key")
        .eq("gallery_id", gallery.id)
        .eq("is_disabled", false)
        .order("sort_order"),
    ]);

    const photos = await Promise.all(
      (mediaRows ?? []).map(async (r: any) => {
        const ready = r.processing_status === "ready";
        const thumbKey = ready && r.thumbnail_key ? r.thumbnail_key : r.original_key;
        const previewKey = ready && r.preview_key ? r.preview_key : r.original_key;
        return {
          id: r.id,
          section_id: r.section_id,
          width: r.width,
          height: r.height,
          thumbnail_url: thumbKey ? await presign(thumbKey, 3600) : null,
          preview_url: previewKey ? await presign(previewKey, 3600) : null,
        };
      }),
    );

    const coverId = gallery.cover_media_id;
    const cover = photos.find((p) => p.id === coverId) ?? photos[0] ?? null;

    // Favoritas desta sessão, em lote.
    let favorite_media_ids: string[] = [];
    if (validVisitor) {
      const { data: favs } = await admin
        .from("gallery_favorites")
        .select("media_id")
        .eq("gallery_id", gallery.id)
        .eq("visitor_session_id", visitorId);
      favorite_media_ids = (favs ?? []).map((f: any) => f.media_id);
    }

    return json({
      favorite_media_ids,
      state: "ok",
      token,
      preview: isOwner && gallery.status !== "published",
      gallery: {
        name: gallery.name,
        event_date: gallery.event_date,
        download_enabled: gallery.download_enabled,
        media_count: photos.length,
        cover_url: cover?.preview_url ?? null,
      },
      photographer,
      sections: sections ?? [],
      photos,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
