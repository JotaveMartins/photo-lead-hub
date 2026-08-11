import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

interface UploadAreaProps {
  onFiles: (files: File[]) => void;
  uploading?: boolean;
  progress?: { done: number; total: number } | null;
  compact?: boolean;
  photoCount?: number;
  maxPhotos?: number;
}

const UploadArea = ({
  onFiles,
  uploading,
  progress,
  compact,
  photoCount = 0,
  maxPhotos = 30,
}: UploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const atLimit = photoCount >= maxPhotos;

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        if (atLimit) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (atLimit) return;
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !uploading && !atLimit && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors ${
        compact ? "gap-1.5 px-6 py-8" : "gap-2 px-6 py-16"
      } ${
        atLimit
          ? "cursor-not-allowed border-amber-500/40 bg-amber-500/5"
          : dragging
            ? "border-primary bg-primary/5"
            : "border-border/70 hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={atLimit}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Enviando {progress ? `${progress.done}/${progress.total}` : ""}...
          </p>
        </>
      ) : atLimit ? (
        <>
          <ImagePlus className="h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium text-amber-500">
            Limite de {maxPhotos} fotos atingido
          </p>
          <p className="text-xs text-muted-foreground">
            Exclua algumas fotos para enviar novas
          </p>
        </>
      ) : (
        <>
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Arraste suas fotografias aqui
          </p>
          <p className="text-xs text-muted-foreground">
            ou clique para selecionar múltiplos arquivos
          </p>
        </>
      )}
      <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
        {photoCount} / {maxPhotos} fotos
      </p>
    </div>
  );
};

export default UploadArea;
