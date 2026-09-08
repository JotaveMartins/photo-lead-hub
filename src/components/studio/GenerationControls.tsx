import SearchSelect from "@/components/SearchSelect";
import { MAX_SLIDES } from "@/lib/carouselSchema";

interface GenerationControlsProps {
  slideCount: number;
  photoCount: number;
  maxPhotos: number;
  onChangeSlideCount: (value: number) => void;
  onChangePhotoCount: (value: number) => void;
  disabled?: boolean;
}

/** Seletores de quantidade de slides e de fotos utilizadas na montagem. */
const GenerationControls = ({
  slideCount,
  photoCount,
  maxPhotos,
  onChangeSlideCount,
  onChangePhotoCount,
  disabled,
}: GenerationControlsProps) => {
  const slideOptions = Array.from({ length: MAX_SLIDES }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} slide${i === 0 ? "" : "s"}`,
  }));
  const photoOptions = Array.from({ length: Math.max(1, maxPhotos) }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} foto${i === 0 ? "" : "s"}`,
  }));

  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${
        disabled || maxPhotos === 0 ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quantos slides
        </label>
        <SearchSelect
          value={String(slideCount)}
          onChange={(v) => onChangeSlideCount(Number(v))}
          options={slideOptions}
          allowEmpty={false}
          placeholder="Quantidade de slides"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quantas fotos usar
        </label>
        <SearchSelect
          value={String(Math.min(photoCount, Math.max(1, maxPhotos)))}
          onChange={(v) => onChangePhotoCount(Number(v))}
          options={photoOptions}
          allowEmpty={false}
          placeholder="Quantidade de fotos"
        />
      </div>
    </div>
  );
};

export default GenerationControls;
