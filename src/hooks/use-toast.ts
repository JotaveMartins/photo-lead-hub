// Compatibilidade: API antiga redirecionada para Sonner (sistema oficial de feedback).
import { toast as sonner } from "sonner";

type LegacyToast = { title?: string; description?: string; variant?: "default" | "destructive" };

function toast({ title, description, variant }: LegacyToast) {
  const fn = variant === "destructive" ? sonner.error : sonner.success;
  fn(title ?? "", description ? { description } : undefined);
}

function useToast() {
  return { toast };
}

export { useToast, toast };
