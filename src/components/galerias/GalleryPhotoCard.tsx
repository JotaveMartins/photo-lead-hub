import { useState } from "react";
import { Star, Trash2, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { retryDerivatives } from "@/lib/galleryRetryDerivatives";
import { toast } from "sonner";
import type { GalleryMedia } from "@/hooks/useGalleries";

interface Props {
  media: GalleryMedia;
  /** URL temporária da miniatura (nunca o original pesado). */
  thumbUrl?: string | null;
  isCover: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onRefresh?: () => void;
  deleting?: boolean;
}

const GalleryPhotoCard = ({
  media,
  thumbUrl,
  isCover,
  onSetCover,
  onDelete,
  onOpen,
  onRefresh,
  deleting,
}: Props) => {
  const [retrying, setRetrying] = useState(false);
  const failed = media.processing_status === "failed";
  const processing = media.processing_status === "pending" || media.processing_status === "processing";

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryDerivatives(media.id);
      toast.success("Miniaturas geradas");
      onRefresh?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar as miniaturas");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Card className="group relative aspect-square overflow-hidden bg-muted/40">
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={media.filename}
          loading="lazy"
          onClick={onOpen}
          className="h-full w-full cursor-zoom-in object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-[11px] text-muted-foreground">
          {failed ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              Erro ao processar
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          )}
        </div>
      )}

      {isCover && (
        <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          Capa
        </span>
      )}

      {(failed || processing) && thumbUrl && (
        <span className="absolute left-1.5 bottom-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {failed ? "Erro ao processar" : "Processando..."}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {(failed || processing) && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            title="Gerar miniaturas novamente"
            className="rounded bg-background/80 p-1.5 hover:bg-background"
          >
            {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          onClick={onSetCover}
          title="Definir como capa"
          className="rounded bg-background/80 p-1.5 hover:bg-background"
        >
          <Star className={`h-3.5 w-3.5 ${isCover ? "fill-primary text-primary" : "text-foreground"}`} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Excluir foto"
          className="rounded bg-background/80 p-1.5 hover:bg-background"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
        </button>
      </div>
    </Card>
  );
};

export default GalleryPhotoCard;
