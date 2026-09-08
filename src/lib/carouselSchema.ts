import {
  LAYOUTS,
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

export interface SlideFocus {
  x: number;
  y: number;
}

export interface EditorSlide {
  key: string;
  layout: LayoutType;
  photoIds: string[];
  /** Enquadramento (0-100) de cada foto dentro do seu espaço. */
  focus?: (SlideFocus | null)[];
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

export interface BuildOptions {
  /** Quantidade de slides desejada (1 a 10). */
  slideCount?: number;
  /** Quantidade de fotos que devem ser utilizadas. */
  photoCount?: number;
}

export const MAX_SLIDES = 10;

/** Capacidades disponíveis nos templates. */
const CAPACITIES = [1, 2, 3, 4, 9];

/** Seleciona um subconjunto de fotos preservando variedade de formatos. */
const selectPhotos = (pool: PhotoInput[], count: number): PhotoInput[] => {
  if (count >= pool.length) return pool;
  const groups: Record<string, PhotoInput[]> = {
    portrait: pool.filter((p) => p.shape === "portrait"),
    landscape: pool.filter((p) => p.shape === "landscape"),
    square: pool.filter((p) => p.shape === "square"),
  };
  const keys = Object.keys(groups).filter((k) => groups[k].length > 0);
  const out: PhotoInput[] = [];
  let i = 0;
  while (out.length < count && keys.length) {
    const key = keys[i % keys.length];
    const g = groups[key];
    if (g.length) out.push(g.shift()!);
    else keys.splice(i % keys.length, 1);
    i++;
  }
  return shuffle(out);
};

/** Divide o total de fotos entre a quantidade de slides usando capacidades válidas. */
const distribute = (total: number, slideCount: number): number[] => {
  const sizes: number[] = [];
  let remaining = total;
  for (let s = slideCount; s > 0; s--) {
    const others = s - 1;
    const min = Math.max(1, remaining - others * 9);
    const max = remaining - others * 1;
    const feasible = CAPACITIES.filter((c) => c >= min && c <= max);
    if (!feasible.length) break;
    const target = remaining / s;
    let best = feasible[0];
    let bestDiff = Infinity;
    for (const c of feasible) {
      const diff = Math.abs(c - target);
      if (diff < bestDiff - 0.001) {
        best = c;
        bestDiff = diff;
      }
    }
    // Pequena variação para evitar carrosséis repetitivos.
    const near = feasible.filter((c) => Math.abs(c - target) <= bestDiff + 1);
    const chosen = near.length > 1 && Math.random() < 0.4 ? pick(near) : best;
    sizes.push(chosen);
    remaining -= chosen;
  }
  return sizes;
};

export const buildDemoCarousel = (
  photos: (string | PhotoInput)[],
  context: { nome: string; tipo_ensaio: string; descricao?: string | null },
  options: BuildOptions = {},
): AiCarouselJson => {
  const all = toPhotoInputs(photos);
  const shuffled = shuffle(all);
  const wanted = Math.min(
    Math.max(1, Math.round(options.photoCount ?? shuffled.length)),
    shuffled.length,
  );
  const pool = selectPhotos(shuffled, wanted);
  const slideCount = Math.min(
    MAX_SLIDES,
    Math.max(1, Math.round(options.slideCount ?? 7)),
  );
  const slides: AiSlideJson[] = [];
  const sizes = distribute(pool.length, slideCount);

  let previous: LayoutType | null = null;
  for (const size of sizes) {
    if (!pool.length) break;
    const sameCapacity = shuffle(
      LAYOUTS.filter((l) => l.capacity === size).map((l) => l.id),
    );
    const ordered = [
      ...sameCapacity.filter((id) => id !== previous),
      ...sameCapacity.filter((id) => id === previous),
    ];
    const fallbacks = shuffle(
      LAYOUTS.filter((l) => l.capacity !== size && l.capacity <= pool.length).map(
        (l) => l.id,
      ),
    ).sort((a, b) => layoutCapacity(b) - layoutCapacity(a));

    let used: LayoutType | null = null;
    let chosen: string[] | null = null;
    for (const id of [...ordered, ...fallbacks]) {
      if (pool.length < layoutCapacity(id)) continue;
      const attempt = fillLayout(id, pool);
      if (attempt) {
        used = id;
        chosen = attempt;
        break;
      }
    }
    if (!chosen || !used) continue;
    previous = used;
    slides.push({ order: slides.length + 1, layout: used, photos: chosen });
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