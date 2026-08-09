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
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const buildDemoCarousel = (
  photoIds: string[],
  context: { nome: string; tipo_ensaio: string; descricao?: string | null },
): AiCarouselJson => {
  const pool = shuffle(photoIds);
  const take = (n: number) => pool.splice(0, n);
  const slides: AiSlideJson[] = [];
  const plans: LayoutType[][] = [
    ["single_frame", "single_full", "grid_2", "single_full", "editorial_2", "grid_4", "single_full"],
    ["single_full", "grid_2", "single_frame", "grid_4", "single_full", "editorial_2", "single_full"],
    ["single_frame", "grid_4", "single_full", "editorial_2", "grid_2", "single_full", "single_full"],
    ["single_full", "editorial_2", "single_full", "grid_2", "single_frame", "single_full", "grid_4"],
  ];
  const plan = pick(plans);

  for (const layout of plan) {
    const need = layoutCapacity(layout);
    if (pool.length < need) continue;
    slides.push({ order: slides.length + 1, layout, photos: take(need) });
    if (slides.length >= 7) break;
  }

  if (slides.length === 0 && photoIds.length > 0) {
    slides.push({ order: 1, layout: "single_full", photos: [photoIds[0]] });
  }

  const tipo = context.tipo_ensaio.toLowerCase();
  const abertura = pick([
    `${context.nome} ✨`,
    `${context.nome} 🤍`,
    `Um dia com ${context.nome}`,
    `Bastidores: ${context.nome}`,
  ]);
  const corpo =
    context.descricao?.trim() ||
    pick([
      `Um recorte especial deste ensaio de ${tipo}.`,
      `Luz, olhar e verdade — assim nasceu este ensaio de ${tipo}.`,
      `Momentos simples que viraram memória neste ensaio de ${tipo}.`,
      `Cada detalhe deste ensaio de ${tipo} conta uma história.`,
    ]);
  const cta = pick([
    "Arrasta pro lado e conta qual é a sua favorita 👉",
    "Deslize e escolha a sua preferida 👉",
    "Qual delas você levaria pra parede de casa? 👉",
    "Salva esse post pra inspirar o seu ensaio 💛",
  ]);
  const caption = [
    abertura,
    "",
    corpo,
    "",
    cta,
    "",
    `#fotografia #${tipo.replace(/[^a-z]/g, "")} #ensaio`,
  ].join("\n");

  return { carousel: { caption, title: context.nome, slides } };
};