import { Trash2, Maximize2 } from "lucide-react";
import { StudioPhoto } from "@/hooks/useStudio";

interface PhotoCardProps {
  photo: StudioPhoto;
  onDelete?: (photo: StudioPhoto) => void;
  onOpen?: (photo: StudioPhoto) => void;
  selected?: boolean;
  onClick?: (photo: StudioPhoto) => void;
}

const PhotoCard = ({ photo, onDelete, onOpen, selected, onClick }: PhotoCardProps) => {
  return (
    <div
      className={`group relative aspect-[4/5] overflow-hidden rounded-lg bg-muted border transition-all ${
        selected ? "border-primary ring-1 ring-primary" : "border-border/60 hover:border-border"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick ? () => onClick(photo) : undefined}
    >
      <img
        src={photo.thumbUrl ?? photo.url}
        alt={photo.filename ?? "Fotografia do projeto"}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(photo);
            }}
            className="rounded-md bg-background/85 p-1.5 text-foreground backdrop-blur hover:bg-background"
            aria-label="Ampliar foto"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(photo);
            }}
            className="rounded-md bg-background/85 p-1.5 text-destructive backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Excluir foto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoCard;