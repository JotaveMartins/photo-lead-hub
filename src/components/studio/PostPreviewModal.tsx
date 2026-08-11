import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Instagram, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StudioPhoto } from "@/hooks/useStudio";
import { EditorSlide } from "@/lib/carouselSchema";
import {
  renderSlideToBlob,
  PREVIEW_W,
  PREVIEW_H,
  PREVIEW_QUALITY,
} from "@/lib/carouselExport";
import { InstagramAccount } from "@/hooks/useSocial";

interface PostPreviewModalProps {
  open: boolean;
  onClose: () => void;
  slides: EditorSlide[];
  caption: string;
  photos: StudioPhoto[];
  account?: InstagramAccount | null;
}

const MAX_DOTS = 7;

const PostPreviewModal = ({
  open,
  onClose,
  slides,
  caption,
  photos,
  account,
}: PostPreviewModalProps) => {
  const [index, setIndex] = useState(0);
  const [rendered, setRendered] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState(false);
  const urlsRef = useRef<string[]>([]);
  const dragX = useRef<number | null>(null);
  const wheelLock = useRef(0);

  const usable = useMemo(
    () => slides.filter((s) => s.photoIds.some((id) => photos.some((p) => p.id === id))),
    [slides, photos],
  );

  const urlById = useMemo(() => {
    const map: Record<string, string> = {};
    photos.forEach((p) => (map[p.id] = p.thumbUrl ?? p.url));
    return map;
  }, [photos]);

  // Reseta ao abrir para refletir sempre o estado atual do carrossel.
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setExpanded(false);
    setRendered({});
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, [open, slides, caption, photos]);

  const renderAt = useCallback(
    async (i: number) => {
      const slide = usable[i];
      if (!slide) return;
      const blob = await renderSlideToBlob(slide, urlById, {
        width: PREVIEW_W,
        height: PREVIEW_H,
        quality: PREVIEW_QUALITY,
      });
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      setRendered((prev) => (prev[i] ? prev : { ...prev, [i]: url }));
    },
    [usable, urlById],
  );

  // Prioriza slide atual, anterior e próximo; o restante carrega progressivamente.
  useEffect(() => {
    if (!open || !usable.length) return;
    let cancelled = false;
    const run = async () => {
      const priority = [index, index + 1, index - 1].filter(
        (i) => i >= 0 && i < usable.length,
      );
      const rest = usable.map((_, i) => i).filter((i) => !priority.includes(i));
      for (const i of [...priority, ...rest]) {
        if (cancelled) return;
        if (rendered[i]) continue;
        await renderAt(i);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, usable.length, renderAt]);

  useEffect(
    () => () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    },
    [],
  );

  const go = (dir: number) =>
    setIndex((i) => Math.min(usable.length - 1, Math.max(0, i + dir)));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, usable.length]);

  const username = account?.username ? `@${account.username}` : "@sua_conta";
  const current = rendered[index];

  const dots = useMemo(() => {
    const total = usable.length;
    if (total <= MAX_DOTS) return usable.map((_, i) => i);
    const half = Math.floor(MAX_DOTS / 2);
    let start = Math.max(0, Math.min(index - half, total - MAX_DOTS));
    return Array.from({ length: MAX_DOTS }, (_, k) => start + k);
  }, [usable.length, index]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(100vw-1.5rem,430px)] gap-0 overflow-hidden rounded-2xl border-border/60 bg-card p-0">
        <DialogTitle className="sr-only">Pré-visualização da publicação</DialogTitle>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-4 py-3">
          {account?.profile_picture_url ? (
            <img
              src={account.profile_picture_url}
              alt={username}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-500/60"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted ring-2 ring-pink-500/40">
              <Instagram className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {account?.username ?? "sua_conta"}
            </p>
            <p className="text-[11px] text-muted-foreground">Publicação em carrossel</p>
          </div>
        </div>

        {/* Área do carrossel */}
        <div
          className="relative aspect-[4/5] w-full select-none overflow-hidden bg-black"
          onPointerDown={(e) => (dragX.current = e.clientX)}
          onPointerUp={(e) => {
            if (dragX.current === null) return;
            const delta = e.clientX - dragX.current;
            if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1);
            dragX.current = null;
          }}
          onPointerCancel={() => (dragX.current = null)}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) < 12 || Date.now() < wheelLock.current) return;
            wheelLock.current = Date.now() + 400;
            go(e.deltaX > 0 ? 1 : -1);
          }}
          onTouchStart={(e) => (dragX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (dragX.current === null) return;
            const delta = e.changedTouches[0].clientX - dragX.current;
            if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1);
            dragX.current = null;
          }}
        >
          {current ? (
            <img
              src={current}
              alt={`Slide ${index + 1}`}
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {usable.length > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {index + 1}/{usable.length}
            </span>
          )}

          {index > 0 && (
            <button
              onClick={() => go(-1)}
              aria-label="Slide anterior"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-black shadow transition hover:bg-white sm:block"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {index < usable.length - 1 && (
            <button
              onClick={() => go(1)}
              aria-label="Próximo slide"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-black shadow transition hover:bg-white sm:block"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Indicadores */}
        {usable.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {dots.map((i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                className={`rounded-full transition-all ${
                  i === index
                    ? "h-1.5 w-1.5 bg-primary"
                    : "h-1.5 w-1.5 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Legenda */}
        <div className="max-h-[28vh] overflow-y-auto px-4 pb-5">
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            <span className="font-semibold">{account?.username ?? "sua_conta"}</span>{" "}
            {caption || "Sem legenda"}
          </p>
          {!expanded && caption.length > 140 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-1 text-sm text-muted-foreground hover:text-foreground"
            >
              mais
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostPreviewModal;
