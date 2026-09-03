import { supabase } from "@/integrations/supabase/client";
import { EditorSlide } from "./carouselSchema";
import {
  renderSlideToBlob,
  EXPORT_W,
  EXPORT_H,
  PUBLISH_QUALITY,
} from "./carouselExport";

export const RENDER_BUCKET = "carousel-renders";

export interface RenderedSlideMeta {
  path: string;
  file_size: number;
  width: number;
  height: number;
  mime_type: string;
}

/** Acima disso tentamos uma compressão extra suave (sem perda visual perceptível). */
const HEAVY_SLIDE_BYTES = 2_500_000;

/**
 * Renderiza cada slide em 1080x1350 JPEG e envia para o bucket privado.
 * Retorna os caminhos (paths) na ordem do carrossel.
 */
export const renderCarouselToStorage = async (
  slides: EditorSlide[],
  urlById: Record<string, string>,
  userId: string,
  carouselId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> => {
  const usable = slides.filter((s) => s.photoIds.some((id) => urlById[id]));
  if (!usable.length) throw new Error("Nenhum slide com fotografia para publicar");
  if (usable.length > 10) throw new Error("O Instagram aceita no máximo 10 imagens por carrossel");

  const stamp = Date.now();
  const paths: string[] = [];
  const meta: RenderedSlideMeta[] = [];

  for (let i = 0; i < usable.length; i++) {
    let blob = await renderSlideToBlob(usable[i], urlById, {
      width: EXPORT_W,
      height: EXPORT_H,
      quality: PUBLISH_QUALITY,
    });

    // Compressão adicional apenas quando o arquivo fica anormalmente pesado.
    if (blob.size > HEAVY_SLIDE_BYTES) {
      const lighter = await renderSlideToBlob(usable[i], urlById, {
        width: EXPORT_W,
        height: EXPORT_H,
        quality: 0.88,
      });
      if (lighter.size < blob.size) blob = lighter;
    }

    const path = `${userId}/${carouselId}/${stamp}-${String(i + 1).padStart(2, "0")}.jpg`;
    const { error } = await supabase.storage
      .from(RENDER_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    paths.push(path);
    meta.push({
      path,
      file_size: blob.size,
      width: EXPORT_W,
      height: EXPORT_H,
      mime_type: "image/jpeg",
    });
    onProgress?.(i + 1, usable.length);
  }

  const { error: updErr } = await supabase
    .from("carousels")
    .update({ rendered_slides: paths, rendered_meta: meta } as any)
    .eq("id", carouselId);
  if (updErr) throw updErr;

  return paths;
};
