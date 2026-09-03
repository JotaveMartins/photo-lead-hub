/**
 * Otimização de fotografias antes do upload.
 * Reduz apenas resolução/peso — não altera cor, contraste, crop ou enquadramento.
 */

export const MAX_UPLOAD_SIDE = 3200;
export const UPLOAD_QUALITY = 0.95;

const canUseCanvas = () =>
  typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined";

const loadBitmap = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback abaixo */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao ler a imagem"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
};

const dims = (src: any) => ({
  width: src.width ?? src.naturalWidth ?? 0,
  height: src.height ?? src.naturalHeight ?? 0,
});

export interface OptimizedImage {
  file: File;
  width: number;
  height: number;
  optimized: boolean;
}

/**
 * Se a foto for maior que `maxSide` (ou muito pesada), gera uma versão JPEG
 * redimensionada preservando a proporção. Caso contrário devolve o arquivo original.
 */
export const optimizeImageFile = async (
  file: File,
  maxSide = MAX_UPLOAD_SIDE,
  quality = UPLOAD_QUALITY,
): Promise<OptimizedImage> => {
  if (!canUseCanvas() || !file.type.startsWith("image/") || file.type === "image/gif") {
    return { file, width: 0, height: 0, optimized: false };
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadBitmap(file);
  } catch {
    return { file, width: 0, height: 0, optimized: false };
  }

  const { width, height } = dims(source);
  if (!width || !height) return { file, width: 0, height: 0, optimized: false };

  const longest = Math.max(width, height);
  const needsResize = longest > maxSide;
  const heavy = file.size > 8_000_000;

  // Nunca aumentar imagens menores; só reprocessa quando há ganho real.
  if (!needsResize && !heavy) {
    (source as ImageBitmap).close?.();
    return { file, width, height, optimized: false };
  }

  const scale = needsResize ? maxSide / longest : 1;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, width, height, optimized: false };
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  (source as ImageBitmap).close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob || blob.size >= file.size * 0.9) {
    return { file, width, height, optimized: false };
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
    width: w,
    height: h,
    optimized: true,
  };
};
