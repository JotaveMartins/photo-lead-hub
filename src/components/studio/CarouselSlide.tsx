import { useRef } from "react";
import { LayoutType, layoutCapacity } from "@/lib/carouselLayouts";
import { StudioPhoto } from "@/hooks/useStudio";
import { Plus, Repeat2, X, Move } from "lucide-react";

export interface SlideFocus {
  x: number;
  y: number;
}

interface CarouselSlideProps {
  layout: LayoutType;
  photoIds: string[];
  photosById: Record<string, StudioPhoto>;
  focus?: (SlideFocus | null)[];
  editable?: boolean;
  onSlotClick?: (index: number) => void;
  onRemovePhoto?: (index: number) => void;
  onFocusChange?: (index: number, focus: SlideFocus) => void;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

const Slot = ({
  photo,
  index,
  editable,
  onSlotClick,
  onRemovePhoto,
  onFocusChange,
  focus,
  className = "",
  frame,
}: any) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const fx = focus?.x ?? 50;
  const fy = focus?.y ?? 50;
  const canDrag = !!photo && editable && !frame && !!onFocusChange;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx, fy };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !imgRef.current) return;
    const el = imgRef.current;
    const boxW = el.clientWidth;
    const boxH = el.clientHeight;
    const nw = el.naturalWidth || boxW;
    const nh = el.naturalHeight || boxH;
    const scale = Math.max(boxW / nw, boxH / nh);
    const overflowX = Math.max(1, nw * scale - boxW);
    const overflowY = Math.max(1, nh * scale - boxH);
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    onFocusChange?.(index, {
      x: clamp(drag.current.fx - (dx / overflowX) * 100),
      y: clamp(drag.current.fy - (dy / overflowY) * 100),
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className={`group/slot relative overflow-hidden bg-muted ${className}`}>
      {photo ? (
        <img
          ref={imgRef}
          src={photo.thumbUrl ?? photo.url}
          alt={photo.filename ?? "Foto do slide"}
          loading="lazy"
          decoding="async"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={frame ? undefined : { objectPosition: `${fx}% ${fy}%` }}
          className={`h-full w-full select-none ${frame ? "object-contain" : "object-cover"} ${
            canDrag ? "cursor-grab active:cursor-grabbing touch-none" : ""
          }`}
        />
      ) : (
        <button
          type="button"
          onClick={() => onSlotClick?.(index)}
          className="flex h-full w-full items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
      {canDrag && (
        <div className="pointer-events-none absolute left-1 top-1 rounded bg-background/80 p-1 text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover/slot:opacity-100">
          <Move className="h-3 w-3" />
        </div>
      )}
      {photo && editable && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 opacity-0 transition-opacity group-hover/slot:opacity-100">
          <button
            type="button"
            onClick={() => onSlotClick?.(index)}
            className="rounded bg-background/90 p-1 text-foreground backdrop-blur"
            aria-label="Substituir foto"
          >
            <Repeat2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onRemovePhoto?.(index)}
            className="rounded bg-background/90 p-1 text-destructive backdrop-blur"
            aria-label="Remover foto do slide"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

const CarouselSlide = ({
  layout,
  photoIds,
  photosById,
  focus,
  editable,
  onSlotClick,
  onRemovePhoto,
  onFocusChange,
}: CarouselSlideProps) => {
  const capacity = layoutCapacity(layout);
  const slots = Array.from({ length: capacity }, (_, i) => photosById[photoIds[i]]);
  const f = (i: number) => focus?.[i] ?? null;
  const common = { editable, onSlotClick, onRemovePhoto, onFocusChange };

  if (layout === "single_frame") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-[10%]">
        <Slot {...common} photo={slots[0]} index={0} frame className="h-full w-full" />
      </div>
    );
  }

  if (layout === "grid_2") {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-0 bg-background">
        {slots.map((p, i) => (
          <Slot key={i} {...common} photo={p} focus={f(i)} index={i} />
        ))}
      </div>
    );
  }

  if (layout === "grid_4") {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0 bg-background">
        {slots.map((p, i) => (
          <Slot key={i} {...common} photo={p} focus={f(i)} index={i} />
        ))}
      </div>
    );
  }

  if (layout === "editorial_2") {
    return (
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-0 bg-background">
        <Slot {...common} photo={slots[0]} focus={f(0)} index={0} className="col-span-2 row-span-2" />
        <Slot {...common} photo={slots[1]} focus={f(1)} index={1} />
        <Slot {...common} photo={slots[2]} focus={f(2)} index={2} />
      </div>
    );
  }

  if (layout === "strip_2" || layout === "strip_3") {
    return (
      <div
        className={`grid h-full w-full gap-0 bg-background ${
          layout === "strip_2" ? "grid-rows-2" : "grid-rows-3"
        }`}
      >
        {slots.map((p, i) => (
          <Slot key={i} {...common} photo={p} focus={f(i)} index={i} />
        ))}
      </div>
    );
  }

  if (layout === "strip_plus_2") {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0 bg-background">
        <Slot {...common} photo={slots[0]} focus={f(0)} index={0} className="col-span-2" />
        <Slot {...common} photo={slots[1]} focus={f(1)} index={1} />
        <Slot {...common} photo={slots[2]} focus={f(2)} index={2} />
      </div>
    );
  }

  return <Slot {...common} photo={slots[0]} focus={f(0)} index={0} className="h-full w-full" />;
};

export default CarouselSlide;
