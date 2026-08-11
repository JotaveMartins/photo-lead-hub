import { LayoutType, layoutCapacity } from "@/lib/carouselLayouts";
import { StudioPhoto } from "@/hooks/useStudio";
import { Plus, Repeat2, X } from "lucide-react";

interface CarouselSlideProps {
  layout: LayoutType;
  photoIds: string[];
  photosById: Record<string, StudioPhoto>;
  editable?: boolean;
  onSlotClick?: (index: number) => void;
  onRemovePhoto?: (index: number) => void;
}

const Slot = ({
  photo,
  index,
  editable,
  onSlotClick,
  onRemovePhoto,
  className = "",
  frame,
}: any) => (
  <div className={`group/slot relative overflow-hidden bg-muted ${className}`}>
    {photo ? (
      <img
        src={photo.thumbUrl ?? photo.url}
        alt={photo.filename ?? "Foto do slide"}
        loading="lazy"
        decoding="async"
        className={`h-full w-full ${frame ? "object-contain" : "object-cover"}`}
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

const CarouselSlide = ({
  layout,
  photoIds,
  photosById,
  editable,
  onSlotClick,
  onRemovePhoto,
}: CarouselSlideProps) => {
  const capacity = layoutCapacity(layout);
  const slots = Array.from({ length: capacity }, (_, i) => photosById[photoIds[i]]);
  const common = { editable, onSlotClick, onRemovePhoto };

  if (layout === "single_frame") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-[10%]">
        <Slot {...common} photo={slots[0]} index={0} frame className="h-full w-full" />
      </div>
    );
  }

  if (layout === "grid_2") {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-[3px] bg-background">
        {slots.map((p, i) => (
          <Slot key={i} {...common} photo={p} index={i} />
        ))}
      </div>
    );
  }

  if (layout === "grid_4") {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[3px] bg-background">
        {slots.map((p, i) => (
          <Slot key={i} {...common} photo={p} index={i} />
        ))}
      </div>
    );
  }

  if (layout === "editorial_2") {
    return (
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-[3px] bg-background">
        <Slot {...common} photo={slots[0]} index={0} className="col-span-2 row-span-2" />
        <Slot {...common} photo={slots[1]} index={1} />
        <Slot {...common} photo={slots[2]} index={2} />
      </div>
    );
  }

  return <Slot {...common} photo={slots[0]} index={0} className="h-full w-full" />;
};

export default CarouselSlide;