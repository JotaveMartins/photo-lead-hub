import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, RefreshCw, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudioPhoto } from "@/hooks/useStudio";
import { EditorSlide } from "@/lib/carouselSchema";
import { LayoutType, layoutCapacity } from "@/lib/carouselLayouts";
import CarouselSlide from "./CarouselSlide";
import LayoutSelector from "./LayoutSelector";
import PhotoPickerDialog from "./PhotoPickerDialog";

interface CarouselEditorProps {
  slides: EditorSlide[];
  caption: string;
  photos: StudioPhoto[];
  status: string;
  saving?: boolean;
  onChangeSlides: (slides: EditorSlide[]) => void;
  onChangeCaption: (caption: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onApprove: () => void;
}

const newKey = () => `slide-${Math.random().toString(36).slice(2, 10)}`;

const CarouselEditor = ({
  slides,
  caption,
  photos,
  status,
  saving,
  onChangeSlides,
  onChangeCaption,
  onSave,
  onRegenerate,
  onApprove,
}: CarouselEditorProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ slide: number; slot: number } | null>(null);

  const photosById = useMemo(() => {
    const map: Record<string, StudioPhoto> = {};
    photos.forEach((p) => (map[p.id] = p));
    return map;
  }, [photos]);

  const update = (index: number, patch: Partial<EditorSlide>) =>
    onChangeSlides(slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const handleDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...slides];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    onChangeSlides(next);
    setDragIndex(null);
  };

  const changeLayout = (index: number, layout: LayoutType) => {
    const cap = layoutCapacity(layout);
    update(index, { layout, photoIds: slides[index].photoIds.slice(0, cap) });
  };

  const handlePick = (photoId: string) => {
    if (!picker) return;
    const slide = slides[picker.slide];
    const ids = [...slide.photoIds];
    ids[picker.slot] = photoId;
    update(picker.slide, { photoIds: ids });
    setPicker(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Carrossel</h2>
          <p className="text-sm text-muted-foreground">
            {slides.length} slides · status {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={saving}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Salvar
          </Button>
          <Button size="sm" onClick={onApprove} disabled={saving}>
            <Check className="mr-1.5 h-4 w-4" /> Aprovar
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={`w-[260px] shrink-0 rounded-xl border bg-card/60 p-3 transition-colors ${
              dragIndex === index ? "border-primary" : "border-border/60"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex cursor-grab items-center gap-1 text-xs font-medium text-muted-foreground">
                <GripVertical className="h-3.5 w-3.5" /> Slide {index + 1}
              </span>
              <button
                onClick={() => onChangeSlides(slides.filter((_, i) => i !== index))}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label="Excluir slide"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="aspect-[4/5] overflow-hidden rounded-md border border-border/50">
              <CarouselSlide
                layout={slide.layout}
                photoIds={slide.photoIds}
                photosById={photosById}
                editable
                onSlotClick={(slot) => setPicker({ slide: index, slot })}
                onRemovePhoto={(slot) =>
                  update(index, {
                    photoIds: slide.photoIds.filter((_, i) => i !== slot),
                  })
                }
              />
            </div>

            <div className="mt-3">
              <LayoutSelector
                value={slide.layout}
                onChange={(l) => changeLayout(index, l)}
              />
            </div>
          </div>
        ))}

        <button
          onClick={() =>
            onChangeSlides([
              ...slides,
              { key: newKey(), layout: "single_full", photoIds: [] },
            ])
          }
          className="flex h-auto w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-medium">Novo slide</span>
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legenda do Instagram
        </label>
        <Textarea
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          rows={7}
          placeholder="Escreva a legenda do post..."
          className="resize-y bg-muted/40"
        />
      </div>

      <PhotoPickerDialog
        open={!!picker}
        photos={photos}
        onClose={() => setPicker(null)}
        onSelect={(p) => handlePick(p.id)}
      />
    </div>
  );
};

export default CarouselEditor;