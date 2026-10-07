import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import StageEditorList from "@/components/stages/StageEditorList";
import StageColorPicker from "@/components/stages/StageColorPicker";
import {
  useDeliveryStages,
  useCreateDeliveryStage,
  useUpdateDeliveryStage,
  useDeleteDeliveryStage,
  useReorderDeliveryStages,
} from "@/hooks/useDeliveryStages";
import type { DeliveryStageColorKey } from "@/lib/deliveryStages";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DeliveryStagesSheet = ({ open, onClose }: Props) => {
  const { data: stages = [], isLoading, isError, refetch } = useDeliveryStages();
  const createStage = useCreateDeliveryStage();
  const updateStage = useUpdateDeliveryStage();
  const deleteStage = useDeleteDeliveryStage();
  const reorder = useReorderDeliveryStages();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<DeliveryStageColorKey>("delivery-1");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const busy =
    createStage.isPending || updateStage.isPending || deleteStage.isPending || reorder.isPending;

  const openStages = stages.filter((s) => s.stage_role === "open");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Informe o nome da etapa");
      return;
    }
    try {
      await createStage.mutateAsync({ name, color_key: newColor });
      setNewName("");
      setNewColor("delivery-1");
    } catch {
      /* erro tratado no hook */
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const ids = stages.map((s) => s.id);
    const idx = ids.indexOf(id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= ids.length) return;
    // Delivered sempre permanece por último.
    if (stages[swapWith]?.stage_role === "delivered" || stages[idx]?.stage_role === "delivered") return;
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    await reorder.mutateAsync(ids);
  };

  const handleDeleteRequest = (id: string) => {
    if (openStages.length <= 1) {
      toast.error("O funil precisa ter pelo menos uma etapa antes da conclusão.");
      return;
    }
    setConfirmDeleteId(id);
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

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">Etapas do Funil de Entregas</SheetTitle>
            <SheetDescription>
              Personalize as etapas de acordo com o seu processo de pós-venda.
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
              <StageEditorList
                stages={stages}
                busy={busy}
                onRename={async (id, name) => {
                  try { await updateStage.mutateAsync({ id, name }); } catch { /* hook */ }
                }}
                onColorChange={async (id, color) => {
                  try { await updateStage.mutateAsync({ id, color_key: color }); } catch { /* hook */ }
                }}
                onMove={handleMove}
                onDelete={handleDeleteRequest}
              />
            )}

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
              <p className="text-sm font-medium text-foreground">Nova etapa</p>
              <div className="space-y-2">
                <Label htmlFor="new-stage-name">Nome *</Label>
                <Input
                  id="new-stage-name"
                  value={newName}
                  maxLength={50}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Em seleção"
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor *</Label>
                <StageColorPicker value={newColor} onChange={setNewColor} disabled={busy} />
              </div>
              <Button onClick={handleCreate} disabled={busy || !newName.trim()} className="gap-2 w-full">
                {createStage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar etapa
              </Button>
              <p className="text-[11px] text-muted-foreground">
                A nova etapa entra imediatamente antes da etapa final.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
        title="Excluir etapa?"
        description="A etapa será removida do funil. Esta ação só é permitida quando não há entregas vinculadas."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleteStage.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default DeliveryStagesSheet;
