/**
 * Geração local (no navegador) das versões reduzidas das fotos.
 * O original nunca é alterado: apenas derivamos preview e miniatura em WebP.
 */

export const PREVIEW_MAX_WIDTH = 2048;
export const PREVIEW_QUALITY = 0.84;
export const THUMB_MAX_WIDTH = 600;
export const THUMB_QUALITY = 0.72;

export interface Derivatives {
  preview: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

const loadBitmap = async (file: File): Promise<ImageBitmap> =>
  // "from-image" respeita a orientação EXIF (fotos verticais continuam verticais).
  await createImageBitmap(file, { imageOrientation: "from-image" });

const toWebp = async (
  bitmap: ImageBitmap,
  maxWidth: number,
  quality: number,
): Promise<Blob> => {
  const scale = Math.min(1, maxWidth / bitmap.width); // nunca aumenta
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("Falha ao gerar WebP");
  return blob;
};

export const generateDerivatives = async (file: File): Promise<Derivatives> => {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await loadBitmap(file);
    const preview = await toWebp(bitmap, PREVIEW_MAX_WIDTH, PREVIEW_QUALITY);
    const thumbnail = await toWebp(bitmap, THUMB_MAX_WIDTH, THUMB_QUALITY);
    return { preview, thumbnail, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap?.close?.();
  }
};

/** Fila simples com concorrência limitada (1 a 2 imagens por vez). */
export const createLimiter = (concurrency: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (active >= concurrency) return;
    const run = queue.shift();
    if (!run) return;
    active++;
    run();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
};
