// Camada de armazenamento das galerias (Cloudflare R2 via S3 API).
// As credenciais do R2 vivem apenas aqui, nunca no frontend.
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

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

const isConfigured = () => !!(ENDPOINT && BUCKET && ACCESS_KEY && SECRET_KEY);

const aws = () =>
  new AwsClient({
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    service: "s3",
    region: REGION,
  });

const objectUrl = (key: string) =>
  `${ENDPOINT}/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

const presign = async (key: string, method: "PUT" | "GET", expiresIn: number) => {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await aws().sign(new Request(url.toString(), { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (!isConfigured()) {
      return json({ error: "Armazenamento de fotos não configurado.", configured: false }, 503);
    }

    // Resolve a galeria alvo (direto ou via mídia) e garante que pertence ao usuário.
    let gallery: { id: string; user_id: string } | null = null;
    let media: any = null;

    if (body?.mediaId) {
      const { data } = await admin
        .from("gallery_media")
        .select("*, galleries!inner(id, user_id)")
        .eq("id", body.mediaId)
        .maybeSingle();
      media = data;
      if (!media) return json({ error: "Foto não encontrada" }, 404);
      gallery = media.galleries;
    } else if (body?.galleryId) {
      const { data } = await admin
        .from("galleries")
        .select("id, user_id")
        .eq("id", body.galleryId)
        .is("deleted_at", null)
        .maybeSingle();
      gallery = data as any;
    }

    if (gallery && gallery.user_id !== user.id) {
      return json({ error: "Galeria não encontrada" }, 403);
    }

    const ownerId = gallery?.user_id ?? user.id;

    const recalc = async (galleryId: string) => {
      const { data: rows } = await admin
        .from("gallery_media")
        .select("size_bytes")
        .eq("gallery_id", galleryId)
        .eq("processing_status", "ready");
      const bytes = (rows ?? []).reduce((s: number, r: any) => s + Number(r.size_bytes || 0), 0);
      await admin
        .from("galleries")
        .update({ storage_bytes: bytes, media_count: (rows ?? []).length })
        .eq("id", galleryId);

      const { data: gals } = await admin
        .from("galleries")
        .select("storage_bytes")
        .eq("user_id", ownerId)
        .is("deleted_at", null);
      const total = (gals ?? []).reduce((s: number, g: any) => s + Number(g.storage_bytes || 0), 0);
      await admin.from("profiles").update({ storage_used_bytes: total }).eq("user_id", ownerId);
      return total;
    };

    if (action === "create-upload-url") {
      if (!gallery) return json({ error: "Galeria não encontrada" }, 404);
      const contentType = String(body.contentType ?? "").toLowerCase();
      const fileSize = Number(body.fileSize ?? 0);
      const ext = ALLOWED_TYPES[contentType];
      if (!ext) return json({ error: "Formato não permitido. Envie JPG ou PNG." }, 400);
      if (!fileSize || fileSize > MAX_FILE_BYTES) {
        return json({ error: "Arquivo acima do limite de 50 MB." }, 400);
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("storage_limit_bytes, storage_used_bytes")
        .eq("user_id", ownerId)
        .maybeSingle();
      const limit = Number((profile as any)?.storage_limit_bytes ?? 10 * 1024 ** 3);
      const used = Number((profile as any)?.storage_used_bytes ?? 0);
      if (used + fileSize > limit) {
        return json({ error: "Você não possui espaço suficiente para enviar este arquivo." }, 400);
      }

      const { data: inserted, error: insErr } = await admin
        .from("gallery_media")
        .insert({
          gallery_id: gallery.id,
          user_id: ownerId,
          section_id: body.sectionId || null,
          filename: String(body.filename ?? "foto").slice(0, 200),
          media_type: "image",
          size_bytes: fileSize,
          processing_status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const key = `galleries/${ownerId}/${gallery.id}/originals/${inserted.id}.${ext}`;
      await admin.from("gallery_media").update({ original_key: key }).eq("id", inserted.id);

      const uploadUrl = await presign(key, "PUT", 600);
      return json({
        mediaId: inserted.id,
        uploadUrl,
        objectKey: key,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      });
    }

    if (action === "confirm-upload") {
      if (!media) return json({ error: "Foto não encontrada" }, 404);
      const head = await aws().fetch(objectUrl(media.original_key), { method: "HEAD" });
      if (!head.ok) return json({ error: "Arquivo não encontrado no armazenamento" }, 400);
      const size = Number(head.headers.get("content-length") ?? media.size_bytes ?? 0);
      await admin
        .from("gallery_media")
        .update({
          processing_status: "ready",
          size_bytes: size,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", media.id);
      const used = await recalc(media.gallery_id);
      return json({ ok: true, sizeBytes: size, storageUsedBytes: used });
    }

    if (action === "delete-media") {
      if (!media) return json({ error: "Foto não encontrada" }, 404);
      if (media.original_key) {
        await aws().fetch(objectUrl(media.original_key), { method: "DELETE" });
      }
      await admin.from("gallery_media").delete().eq("id", media.id);
      await admin
        .from("galleries")
        .update({ cover_media_id: null })
        .eq("id", media.gallery_id)
        .eq("cover_media_id", media.id);
      const used = await recalc(media.gallery_id);
      return json({ ok: true, storageUsedBytes: used });
    }

    if (action === "get-view-url") {
      if (!media?.original_key) return json({ error: "Foto sem arquivo" }, 404);
      return json({ url: await presign(media.original_key, "GET", 3600) });
    }

    if (action === "cleanup-pending") {
      if (!gallery) return json({ error: "Galeria não encontrada" }, 404);
      await admin
        .from("gallery_media")
        .delete()
        .eq("gallery_id", gallery.id)
        .eq("processing_status", "pending")
        .lt("created_at", new Date(Date.now() - 3600_000).toISOString());
      return json({ ok: true });
    }

    return json({ error: "Ação inválida", action }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
