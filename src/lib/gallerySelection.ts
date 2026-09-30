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
