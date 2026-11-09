import { useReviewLocale } from "@/i18n/ReviewLocale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudioPhoto } from "@/hooks/useStudio";

interface PhotoPickerDialogProps {
  open: boolean;
  photos: StudioPhoto[];
  onSelect: (photo: StudioPhoto) => void;
  onClose: () => void;
}

const PhotoPickerDialog = ({ open, photos, onSelect, onClose }: PhotoPickerDialogProps) => {
  const { t } = useReviewLocale();
  return (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle className="font-display">{t("Escolher fotografia")}</DialogTitle>
      </DialogHeader>
      <div className="grid max-h-[65vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="aspect-[4/5] overflow-hidden rounded-md border border-border/60 transition-all hover:border-primary"
          >
            <img
              src={p.thumbUrl ?? p.url}
              alt={p.filename ?? t("Foto")}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
        {!photos.length && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("Nenhuma foto disponível.")}</p>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
};

export default PhotoPickerDialog;