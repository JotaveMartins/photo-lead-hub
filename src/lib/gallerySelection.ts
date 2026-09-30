import type { StatusTone } from "@/components/ui/status-badge";

export type SelectionStatus = "waiting" | "in_progress" | "finalized";

/** Status derivado da seleção (sem enum no banco). */
export const getSelectionStatus = (finalizedAt: string | null | undefined, count: number): SelectionStatus =>
  finalizedAt ? "finalized" : count > 0 ? "in_progress" : "waiting";

export const selectionStatusMeta: Record<SelectionStatus, { label: string; tone: StatusTone }> = {
  waiting: { label: "Aguardando seleção", tone: "neutral" },
  in_progress: { label: "Seleção em andamento", tone: "warning" },
  finalized: { label: "Seleção finalizada", tone: "success" },
};

/** A seleção pode ser alterada pelo cliente? */
export const canEditSelection = (opts: { finalizedAt?: string | null; preview?: boolean }) =>
  !opts.finalizedAt && !opts.preview;

/** O cliente pode finalizar? */
export const canFinalizeSelection = (opts: { finalizedAt?: string | null; preview?: boolean; count: number; limit: number | null | undefined }) =>
  canEditSelection(opts) && !!opts.limit && opts.count >= 1 && opts.count <= opts.limit;

/** Linha curta para o card do Funil de Entregas. */
export const selectionFunnelLabel = (finalizedAt: string | null | undefined, count: number, limit: number | null | undefined) => {
  const status = getSelectionStatus(finalizedAt, count);
  const prefix = status === "finalized" ? "Seleção finalizada" : status === "in_progress" ? "Seleção" : "Aguardando seleção";
  return `${prefix} · ${count}/${limit ?? "-"}`;
};

/** Nomes dos arquivos selecionados, um por linha, na ordem da galeria. */
export const selectedFilenames = (media: { id: string; filename: string }[], selectedIds: Set<string>) =>
  media.filter((m) => selectedIds.has(m.id)).map((m) => m.filename).join("\n");
