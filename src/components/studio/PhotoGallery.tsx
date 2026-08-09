import { useState } from "react";
import { StudioPhoto } from "@/hooks/useStudio";
import PhotoCard from "./PhotoCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PhotoGalleryProps {
  photos: StudioPhoto[];
  onDelete?: (photo: StudioPhoto) => void;
  emptyMessage?: string;
}

const PhotoGallery = ({ photos, onDelete, emptyMessage }: PhotoGalleryProps) => {
  const [preview, setPreview] = useState<StudioPhoto | null>(null);

  if (!photos.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Nenhuma fotografia enviada ainda."}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {photos.map((p) => (
          <PhotoCard key={p.id} photo={p} onDelete={onDelete} onOpen={setPreview} />
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl border-border/60 bg-background/95 p-2">
          {preview && (
            <img
              src={preview.url}
              alt={preview.filename ?? "Fotografia ampliada"}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;