import {
  LayoutType,
  PhotoShape,
  layoutCapacity,
  layoutSlots,
  shapeFits,
} from "./carouselLayouts";

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

export interface PhotoInput {
  id: string;
  shape: PhotoShape;
}

const toPhotoInputs = (photos: (string | PhotoInput)[]): PhotoInput[] =>
  photos.map((p) =>
    typeof p === "string" ? { id: p, shape: "portrait" as PhotoShape } : p,
  );

/**
 * Tenta preencher um layout respeitando o formato esperado de cada espaço.
 * Devolve null quando não há fotos compatíveis suficientes.
 */
const fillLayout = (layout: LayoutType, pool: PhotoInput[]): string[] | null => {
  const slots = layoutSlots(layout);
  const used: number[] = [];
  const chosen: string[] = [];

  for (const slot of slots) {
    const idx = pool.findIndex(
      (p, i) => !used.includes(i) && shapeFits(slot, p.shape),
    );
    if (idx === -1) return null;
    used.push(idx);
    chosen.push(pool[idx].id);
  }

  used
    .sort((a, b) => b - a)
    .forEach((i) => pool.splice(i, 1));
  return chosen;
};

export const buildDemoCarousel = (
  photos: (string | PhotoInput)[],
  context: { nome: string; tipo_ensaio: string; descricao?: string | null },
): AiCarouselJson => {
  const all = toPhotoInputs(photos);
  const pool = shuffle(all);
  const landscapes = pool.filter((p) => p.shape === "landscape").length;
  const manyWide = landscapes >= Math.max(2, Math.ceil(pool.length * 0.4));
  const slides: AiSlideJson[] = [];
  const portraitPlans: LayoutType[][] = [
    ["single_frame", "single_full", "grid_2", "single_full", "editorial_2", "grid_4", "single_full"],
    ["single_full", "grid_2", "single_frame", "grid_4", "single_full", "editorial_2", "single_full"],
    ["single_frame", "grid_4", "single_full", "editorial_2", "grid_2", "single_full", "single_full"],
    ["single_full", "editorial_2", "single_full", "grid_2", "single_frame", "single_full", "grid_4"],
  ];
  const widePlans: LayoutType[][] = [
    ["single_frame", "strip_3", "single_full", "strip_2", "grid_2", "strip_plus_2", "single_full"],
    ["strip_2", "single_full", "strip_3", "grid_2", "single_frame", "strip_plus_2", "single_full"],
    ["single_full", "strip_plus_2", "strip_3", "single_frame", "strip_2", "grid_4", "single_full"],
  ];
  const plan = pick(manyWide ? widePlans : portraitPlans);
  /** Alternativas quando o layout planejado não encontra fotos compatíveis. */
  const fallbacks: LayoutType[] = [
    "single_full",
    "single_frame",
    "strip_2",
    "strip_3",
    "grid_2",
    "grid_4",
    "editorial_2",
    "strip_plus_2",
  ];

  for (const layout of plan) {
    if (!pool.length) break;
    let used: LayoutType = layout;
    let chosen = fillLayout(layout, pool);
    if (!chosen) {
      for (const alt of fallbacks) {
        if (alt === layout) continue;
        if (pool.length < layoutCapacity(alt)) continue;
        const attempt = fillLayout(alt, pool);
        if (attempt) {
          used = alt;
          chosen = attempt;
          break;
        }
      }
    }
    if (!chosen) continue;
    slides.push({ order: slides.length + 1, layout: used, photos: chosen });
    if (slides.length >= 7) break;
  }

  if (slides.length === 0 && all.length > 0) {
    const first = all[0];
    slides.push({
      order: 1,
      layout: first.shape === "landscape" ? "single_frame" : "single_full",
      photos: [first.id],
    });
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