import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Ação "Tentar novamente" (normalmente o refetch da query). */
  onRetry?: () => void;
  /** Versão compacta para seções secundárias dentro de uma tela. */
  compact?: boolean;
  className?: string;
}

/**
 * Consulta FALHOU. Nunca usar EmptyState para erro.
 * Não exibir mensagens técnicas do backend.
 */
export function ErrorState({
  title,
  description = "Tente novamente em alguns instantes.",
  onRetry,
  compact,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex text-center",
        compact
          ? "flex-col items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4"
          : "flex-col items-center justify-center gap-2 px-4 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-destructive/10",
          compact ? "h-8 w-8" : "mb-2 h-12 w-12",
        )}
      >
        <AlertTriangle className={cn("text-destructive", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <p className={cn("font-display font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} className={cn(compact ? "mt-1 min-h-10" : "mt-3")} onClick={() => onRetry()}>
          <RotateCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
