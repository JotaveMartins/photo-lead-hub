import { useEffect, useState } from "react";
import { Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  /** Called once when the stored Instagram photo link no longer loads (links expire). */
  onBroken?: () => void;
}

/** Instagram profile photo with an icon fallback for missing or expired links. */
export function InstagramAvatar({ src, alt = "", className, onBroken }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted", className)}>
        <Instagram className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={cn("h-9 w-9 shrink-0 rounded-full object-cover", className)}
      onError={() => {
        setFailed(true);
        onBroken?.();
      }}
    />
  );
}
