import JSZip from "jszip";
import { LayoutType, layoutCapacity } from "./carouselLayouts";
import { EditorSlide } from "./carouselSchema";

export const EXPORT_W = 1080;
export const EXPORT_H = 1350;

/** Qualidade JPEG destinada à publicação (Instagram). */
export const PUBLISH_QUALITY = 0.88;
/** Dimensões usadas apenas para pré-visualização na interface. */
export const PREVIEW_W = 540;
export const PREVIEW_H = 675;
export const PREVIEW_QUALITY = 0.72;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  contain?: boolean;
}

const GAP = 0;

/** Retângulos (em px do canvas final) para cada slot do layout. */
export const layoutRects = (
  layout: LayoutType,
  W: number = EXPORT_W,
  H: number = EXPORT_H,
): Rect[] => {
  const g = Math.max(1, Math.round((GAP * W) / EXPORT_W));

  if (layout === "single_frame") {
    const pad = Math.round(W * 0.1);
    return [{ x: pad, y: pad, w: W - pad * 2, h: H - pad * 2, contain: true }];
  }
  if (layout === "grid_2") {
    const w = (W - g) / 2;
    return [
      { x: 0, y: 0, w, h: H },
      { x: w + g, y: 0, w, h: H },
    ];
  }
  if (layout === "grid_4") {
    const w = (W - g) / 2;
    const h = (H - g) / 2;
    return [
      { x: 0, y: 0, w, h },
      { x: w + g, y: 0, w, h },
      { x: 0, y: h + g, w, h },
      { x: w + g, y: h + g, w, h },
    ];
  }
  if (layout === "editorial_2") {
    const big = Math.round((W - g) * (2 / 3));
    const small = W - g - big;
    const h = (H - g) / 2;
    return [
      { x: 0, y: 0, w: big, h: H },
      { x: big + g, y: 0, w: small, h },
      { x: big + g, y: h + g, w: small, h },
    ];
  }
  if (layout === "strip_2") {
    const h = (H - g) / 2;
    return [
      { x: 0, y: 0, w: W, h },
      { x: 0, y: h + g, w: W, h },
    ];
  }
  if (layout === "strip_3") {
    const h = (H - g * 2) / 3;
    return [
      { x: 0, y: 0, w: W, h },
      { x: 0, y: h + g, w: W, h },
      { x: 0, y: (h + g) * 2, w: W, h },
    ];
  }
  if (layout === "strip_plus_2") {
    const top = (H - g) / 2;
    const bottom = H - g - top;
    const w = (W - g) / 2;
    return [
      { x: 0, y: 0, w: W, h: top },
      { x: 0, y: top + g, w, h: bottom },
      { x: w + g, y: top + g, w, h: bottom },
    ];
  }
  return [{ x: 0, y: 0, w: W, h: H }];
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });

/** Fallback: baixa via fetch e converte para blob URL (evita canvas "tainted"). */
const loadImageSafe = async (url: string): Promise<HTMLImageElement> => {
  try {
    return await loadImage(url);
  } catch {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImage(objectUrl);
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    }
  }
};

const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  r: Rect,
  focus?: { x: number; y: number } | null,
) => {
  const scale = Math.max(r.w / img.width, r.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const fx = (focus?.x ?? 50) / 100;
  const fy = (focus?.y ?? 50) / 100;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(img, r.x + (r.w - w) * fx, r.y + (r.h - h) * fy, w, h);
  ctx.restore();
};


const drawContain = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  r: Rect,
) => {
  const scale = Math.min(r.w / img.width, r.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
};

export interface RenderOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export const renderSlideToBlob = async (
  slide: EditorSlide,
  urlById: Record<string, string>,
  options: RenderOptions = {},
): Promise<Blob> => {
  const W = options.width ?? EXPORT_W;
  const H = options.height ?? EXPORT_H;
  const quality = options.quality ?? 0.92;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = slide.layout === "single_frame" ? "#ffffff" : "#0b0b0c";
  ctx.fillRect(0, 0, W, H);

  const rects = layoutRects(slide.layout, W, H);
  const capacity = layoutCapacity(slide.layout);

  for (let i = 0; i < capacity; i++) {
    const url = urlById[slide.photoIds[i]];
    const rect = rects[i];
    if (!url || !rect) continue;
    const img = await loadImageSafe(url);
    if (rect.contain) drawContain(ctx, img, rect);
    else drawCover(ctx, img, rect, slide.focus?.[i] ?? null);
  }


  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      quality,
    ),
  );
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "carrossel";

export const exportCarousel = async (
  slides: EditorSlide[],
  urlById: Record<string, string>,
  nome: string,
  onProgress?: (done: number, total: number) => void,
) => {
  const usable = slides.filter((s) => s.photoIds.some((id) => urlById[id]));
  if (!usable.length) throw new Error("Nenhum slide com fotografia para exportar");

  const base = slugify(nome);
  const blobs: Blob[] = [];
  for (let i = 0; i < usable.length; i++) {
    blobs.push(await renderSlideToBlob(usable[i], urlById));
    onProgress?.(i + 1, usable.length);
  }

  if (blobs.length === 1) {
    triggerDownload(blobs[0], `${base}.jpg`);
    return 1;
  }

  const zip = new JSZip();
  blobs.forEach((b, i) =>
    zip.file(`${String(i + 1).padStart(2, "0")}.jpg`, b),
  );
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${base}.zip`);
  return blobs.length;
};
