import { StorageService, putToR2 } from "@/lib/storage/StorageService";
import { generateDerivatives } from "@/lib/imageDerivatives";

/**
 * Regera miniatura e visualização de uma foto cujo original já está no R2.
 * O original não é reenviado.
 */
export const retryDerivatives = async (mediaId: string) => {
  const { url } = await StorageService.getViewUrl(mediaId);
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("Não foi possível ler o arquivo original");
    return r.blob();
  });
  const file = new File([blob], "original", { type: blob.type || "image/jpeg" });
  const derived = await generateDerivatives(file);
  const targets = await StorageService.retryDerivativesUrl(mediaId);
  await putToR2(targets.preview.uploadUrl, derived.preview);
  await putToR2(targets.thumbnail.uploadUrl, derived.thumbnail);
  await StorageService.confirmUpload(mediaId, { width: derived.width, height: derived.height });
};
