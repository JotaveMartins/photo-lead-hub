import { useState } from "react";
import { Plus, Loader2, ArrowDown, ArrowUp, Check, Lock, Pencil, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { cn } from "@/lib/utils";
import {
  usePipelineStages,
  useCreatePipelineStage,
  useUpdatePipelineStage,
  useDeletePipelineStage,
  useReorderPipelineStages,
} from "@/hooks/usePipelineStages";
import {
  PIPELINE_STAGE_COLOR_KEYS,
  pipelineStageColorClass,
  isTerminalStage,
  type PipelineStage,
  type PipelineStageColorKey,
} from "@/lib/pipelineStages";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROLE_INFO: Record<string, { label: string; hint: string; locked?: boolean }> = {
  lead: { label: "Etapa inicial", hint: "Novos leads entram nesta etapa", locked: true },
  proposal: { label: "Proposta", hint: "Usada para métricas e regras de proposta" },
  won: { label: "Ganho", hint: "Conclui a venda", locked: true },
  lost: { label: "Perda", hint: "Encerra o negócio como perdido", locked: true },
};

const PipelineStagesSheet = ({ open, onClose }: Props) => {
  const { stages, isLoading, isError, refetch } = usePipelineStages();
  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();
  const reorder = useReorderPipelineStages();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<PipelineStageColorKey>("stage-2");
  const [newRole, setNewRole] = useState<"open" | "proposal">("open");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const busy =
    createStage.isPending || updateStage.isPending || deleteStage.isPending || reorder.isPending;

  const hasProposal = stages.some((s) => s.stage_role === "proposal");
  const deletableOpenCount = stages.filter((s) => !isTerminalStage(s) && s.stage_role !== "lead").length;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Informe o nome da etapa");
      return;
    }
    try {
      await createStage.mutateAsync({ name, color_key: newColor, role: newRole });
      setNewName("");
      setNewColor("stage-2");
      setNewRole("open");
    } catch {
      /* erro tratado no hook */
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const ids = stages.map((s) => s.id);
    const idx = ids.indexOf(id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= ids.length) return;
    const a = stages[idx];
    const b = stages[swapWith];
    // lead permanece primeira; won/lost permanecem terminais
    if (a.stage_role === "lead" || b.stage_role === "lead") return;
    if (isTerminalStage(a) || isTerminalStage(b)) return;
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    try {
      await reorder.mutateAsync(ids);
    } catch {
      /* erro tratado no hook */
    }
  };

  const handleDeleteRequest = (stage: PipelineStage) => {
    if (stage.stage_role === "open" && deletableOpenCount <= 1 && !hasProposal) {
      toast.error("O funil precisa ter pelo menos uma etapa entre a inicial e as finais.");
      return;
    }
    setConfirmDeleteId(stage.id);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteStage.mutateAsync(confirmDeleteId);
    } catch {
      /* erro tratado no hook */
    }
    setConfirmDeleteId(null);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    setEditingId(null);
    if (!name) return;
    try {
      await updateStage.mutateAsync({ id: editingId, name });
    } catch {
      /* erro tratado no hook */
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">Etapas do Funil de Leads</SheetTitle>
            <SheetDescription>
              Personalize as etapas de acordo com o seu processo comercial.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : isError ? (
              <ErrorState
                title="Não foi possível carregar as etapas do funil"
                onRetry={() => refetch()}
              />
            ) : (
              <ul className="space-y-2">
                {stages.map((s, idx) => {
                  const info = ROLE_INFO[s.stage_role];
                  const terminal = isTerminalStage(s);
                  const isLead = s.stage_role === "lead";
                  const editing = editingId === s.id;
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
                    >
                      <span className={cn("w-3.5 h-3.5 rounded-full shrink-0", pipelineStageColorClass(s.color_key))} />

                      <div className="min-w-[8rem] flex-1">
                        {editing ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              autoFocus
                              value={editingName}
                              maxLength={50}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit();
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 bg-card border-border"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={commitEdit} aria-label="Salvar nome">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancelar">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                            {info && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                {info.locked && <Lock className="w-3 h-3" />}
                                {info.label} · {info.hint}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {!editing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor da etapa">
                            {PIPELINE_STAGE_COLOR_KEYS.map((key) => (
                              <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={s.color_key === key}
                                aria-label={`Cor ${key}`}
                                disabled={busy}
                                onClick={async () => {
                                  try { await updateStage.mutateAsync({ id: s.id, color_key: key }); } catch { /* hook */ }
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-full transition-all",
                                  pipelineStageColorClass(key),
                                  s.color_key === key
                                    ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/70 scale-110"
                                    : "opacity-60 hover:opacity-100"
                                )}
                              />
                            ))}
                          </div>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => handleMove(s.id, "up")}
                            disabled={busy || idx === 0 || isLead || terminal || stages[idx - 1]?.stage_role === "lead" === false && false || isTerminalStage(stages[idx - 1]) || stages[idx - 1]?.stage_role === "lead"}
                            aria-label="Mover para cima"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => handleMove(s.id, "down")}
                            disabled={busy || terminal || isTerminalStage(stages[idx + 1]) || idx === stages.length - 1}
                            aria-label="Mover para baixo"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                            disabled={busy}
                            aria-label="Renomear etapa"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!isLead && !terminal && (
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRequest(s)}
                              disabled={busy}
                              aria-label="Excluir etapa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
              <p className="text-sm font-medium text-foreground">Nova etapa</p>
              <div className="space-y-2">
                <Label htmlFor="new-pipeline-stage-name">Nome *</Label>
                <Input
                  id="new-pipeline-stage-name"
                  value={newName}
                  maxLength={50}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Reunião Agendada"
                  className="bg-card border-border"
                />
              </div>
              {!hasProposal && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex gap-2">
                    {(["open", "proposal"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRole(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          newRole === r
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {r === "open" ? "Etapa comum" : "Etapa de proposta"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Cor *</Label>
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor da nova etapa">
                  {PIPELINE_STAGE_COLOR_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={newColor === key}
                      aria-label={`Cor ${key}`}
                      disabled={busy}
                      onClick={() => setNewColor(key)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        pipelineStageColorClass(key),
                        newColor === key
                          ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/70 scale-110"
                          : "opacity-60 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={busy || !newName.trim()} className="gap-2 w-full">
                {createStage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar etapa
              </Button>
              <p className="text-[11px] text-muted-foreground">
                A nova etapa entra imediatamente antes das etapas de ganho e perda.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
        title="Excluir etapa?"
        description="A etapa será removida do funil. Esta ação só é permitida quando não há leads vinculados."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleteStage.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default PipelineStagesSheet;
