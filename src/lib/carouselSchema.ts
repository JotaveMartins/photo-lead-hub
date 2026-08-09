import { LayoutType, layoutCapacity } from "./carouselLayouts";

/**
 * Estrutura que futuramente será devolvida por uma API multimodal (OpenAI, etc).
 * O editor é capaz de renderizar um carrossel diretamente a partir dela.
 */
export interface AiSlideJson {
  order: number;
  layout: LayoutType;
  photos: string[]; // ids de fotos
}

export interface AiCarouselJson {
  carousel: {
    caption: string;
    title?: string;
    slides: AiSlideJson[];
  };
}

export interface EditorSlide {
  key: string;
  layout: LayoutType;
  photoIds: string[];
}

export const aiJsonToSlides = (json: AiCarouselJson): EditorSlide[] =>
  [...json.carousel.slides]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({
      key: `slide-${i}-${Math.random().toString(36).slice(2, 8)}`,
      layout: s.layout,
      photoIds: s.photos.slice(0, layoutCapacity(s.layout)),
    }));

/**
 * Gerador de demonstração (placeholder da IA).
 * Não altera nenhuma fotografia — apenas seleciona e organiza.
 */
export const buildDemoCarousel = (
  photoIds: string[],
  context: { nome: string; tipo_ensaio: string; descricao?: string | null },
): AiCarouselJson => {
  const pool = [...photoIds];
  const take = (n: number) => pool.splice(0, n);
  const slides: AiSlideJson[] = [];
  const plan: LayoutType[] = [
    "single_frame",
    "single_full",
    "grid_2",
    "single_full",
    "editorial_2",
    "grid_4",
    "single_full",
  ];

  for (const layout of plan) {
    const need = layoutCapacity(layout);
    if (pool.length < need) continue;
    slides.push({ order: slides.length + 1, layout, photos: take(need) });
    if (slides.length >= 7) break;
  }

  if (slides.length === 0 && photoIds.length > 0) {
    slides.push({ order: 1, layout: "single_full", photos: [photoIds[0]] });
  }

  const caption = [
    `${context.nome} ✨`,
    "",
    context.descricao?.trim() ||
      `Um recorte especial deste ensaio de ${context.tipo_ensaio.toLowerCase()}.`,
    "",
    "Arrasta pro lado e conta qual é a sua favorita 👉",
    "",
    `#fotografia #${context.tipo_ensaio.toLowerCase().replace(/[^a-z]/g, "")} #ensaio`,
  ].join("\n");

  return { carousel: { caption, title: context.nome, slides } };
};