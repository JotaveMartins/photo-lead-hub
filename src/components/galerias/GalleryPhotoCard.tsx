import { useEffect, useState } from "react";
import { Star, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StorageService } from "@/lib/storage/StorageService";
import type { GalleryMedia } from "@/hooks/useGalleries";

interface Props {
  media: GalleryMedia;
  isCover: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

const GalleryPhotoCard = ({ media, isCover, onSetCover, onDelete, deleting }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (media.processing_status !== "ready") return;
    StorageService.getViewUrl(media.id)
      .then((r) => active && setUrl(r.url))
      .catch(() => undefined);
    return () => { active = false; };
  }, [media.id, media.processing_status]);

  return (
    <Card className="group relative aspect-square overflow-hidden bg-muted/40">
      {url ? (
        <img src={url} alt={media.filename} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
          {media.processing_status === "ready" ? <Loader2 className="h-4 w-4 animate-spin" /> : media.filename}
        </div>
      )}

      {isCover && (
        <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          Capa
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
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
