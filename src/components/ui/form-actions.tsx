import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  onCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  className?: string;
}

/** Rodapé padrão de formulário: Cancelar (outline) + Salvar/Criar (submit). */
export function FormActions({
  onCancel,
  loading,
  disabled,
  submitLabel = "Salvar",
  loadingLabel = "Salvando...",
  cancelLabel = "Cancelar",
  className,
}: FormActionsProps) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)}>
      <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={loading || disabled}>
        {loading ? loadingLabel : submitLabel}
      </Button>
    </div>
  );
}
