import { supabase } from "@/integrations/supabase/client";
import { EditorSlide } from "./carouselSchema";
import { renderSlideToBlob } from "./carouselExport";

export const RENDER_BUCKET = "carousel-renders";

/**
 * Renderiza cada slide em 1080x1350 e envia para o bucket privado.
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

  for (let i = 0; i < usable.length; i++) {
    const blob = await renderSlideToBlob(usable[i], urlById);
    const path = `${userId}/${carouselId}/${stamp}-${String(i + 1).padStart(2, "0")}.jpg`;
    const { error } = await supabase.storage
      .from(RENDER_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    paths.push(path);
    onProgress?.(i + 1, usable.length);
  }

  const { error: updErr } = await supabase
    .from("carousels")
    .update({ rendered_slides: paths })
    .eq("id", carouselId);
  if (updErr) throw updErr;

  return paths;
};