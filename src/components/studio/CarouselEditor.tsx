import { useMemo, useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Check,
  Loader2,
  Download,
  Copy,
  Pencil,
  Sparkles,
  Eye,
} from "lucide-react";
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
  savingLabel?: string;
  dirty?: boolean;
  justSaved?: boolean;
  readOnly?: boolean;
  exporting?: string | null;
  onChangeSlides: (slides: EditorSlide[]) => void;
  onChangeCaption: (caption: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onApprove: () => void;
  onDownload?: () => void;
  onCopyCaption?: () => void;
  onEditAgain?: () => void;
  onGenerateCaption?: () => void;
  generatingCaption?: boolean;
  onPreviewPost?: () => void;
}

const newKey = () => `slide-${Math.random().toString(36).slice(2, 10)}`;

const statusStyles: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  "Em edição": "bg-amber-500/15 text-amber-500",
  Gerado: "bg-sky-500/15 text-sky-400",
  Aprovado: "bg-emerald-500/15 text-emerald-400",
};

const CarouselEditor = ({
  slides,
  caption,
  photos,
  status,
  saving,
  savingLabel,
  dirty,
  justSaved,
  readOnly,
  exporting,
  onChangeSlides,
  onChangeCaption,
  onSave,
  onRegenerate,
  onApprove,
  onDownload,
  onCopyCaption,
  onEditAgain,
  onGenerateCaption,
  generatingCaption,
  onPreviewPost,
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
    if (readOnly || dragIndex === null || dragIndex === target) return;
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
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">Carrossel</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                statusStyles[status] ?? statusStyles.Rascunho
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {slides.length} slides
            {justSaved ? (
              <span className="ml-2 text-emerald-400">· salvo</span>
            ) : dirty ? (
              <span className="ml-2 text-amber-500">· alterações não salvas</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {readOnly ? (
            <>
              <Button variant="outline" size="sm" onClick={onPreviewPost}>
                <Eye className="mr-1.5 h-4 w-4" /> Pré-visualizar publicação
              </Button>
              <Button variant="outline" size="sm" onClick={onEditAgain}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar novamente
              </Button>
              <Button variant="outline" size="sm" onClick={onCopyCaption}>
                <Copy className="mr-1.5 h-4 w-4" /> Copiar legenda
              </Button>
              <Button size="sm" onClick={onDownload} disabled={!!exporting}>
                {exporting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                {exporting ?? "Baixar carrossel"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onPreviewPost}>
                <Eye className="mr-1.5 h-4 w-4" /> Pré-visualizar publicação
              </Button>
              <Button variant="outline" size="sm" onClick={onRegenerate} disabled={saving}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
              </Button>
              <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : justSaved ? (
                  <Check className="mr-1.5 h-4 w-4 text-emerald-400" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {saving ? savingLabel ?? "Salvando..." : justSaved ? "Salvo" : "Salvar"}
              </Button>
              <Button size="sm" onClick={onApprove} disabled={saving}>
                <Check className="mr-1.5 h-4 w-4" /> Aprovar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            draggable={!readOnly}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={`w-[260px] shrink-0 rounded-xl border bg-card/60 p-3 transition-colors ${
              dragIndex === index ? "border-primary" : "border-border/60"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex cursor-grab items-center gap-1 text-xs font-medium text-muted-foreground">
                {!readOnly && <GripVertical className="h-3.5 w-3.5" />} Slide {index + 1}
              </span>
              {!readOnly && (
                <button
                  onClick={() => onChangeSlides(slides.filter((_, i) => i !== index))}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Excluir slide"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="aspect-[4/5] overflow-hidden rounded-md border border-border/50">
              <CarouselSlide
                layout={slide.layout}
                photoIds={slide.photoIds}
                photosById={photosById}
                editable={!readOnly}
                onSlotClick={(slot) => setPicker({ slide: index, slot })}
                onRemovePhoto={(slot) =>
                  update(index, {
                    photoIds: slide.photoIds.filter((_, i) => i !== slot),
                  })
                }
              />
            </div>

            {!readOnly && (
              <div className="mt-3">
                <LayoutSelector
                  value={slide.layout}
                  onChange={(l) => changeLayout(index, l)}
                />
              </div>
            )}
          </div>
        ))}

        {!readOnly && (
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
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Legenda do Instagram
          </label>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateCaption}
              disabled={generatingCaption || !slides.length}
            >
              {generatingCaption ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {generatingCaption ? "Analisando fotos..." : "Gerar legenda com IA"}
            </Button>
          )}
        </div>
        <Textarea
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          readOnly={readOnly}
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