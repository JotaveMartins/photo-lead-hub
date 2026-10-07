import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Lock, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StageColorPicker from "@/components/stages/StageColorPicker";
import { deliveryStageColorClass, type DeliveryStage, type DeliveryStageColorKey } from "@/lib/deliveryStages";

interface Props {
  stages: DeliveryStage[];
  onRename: (id: string, name: string) => Promise<void> | void;
  onColorChange: (id: string, color: DeliveryStageColorKey) => Promise<void> | void;
  onMove: (id: string, direction: "up" | "down") => Promise<void> | void;
  onDelete: (id: string) => void;
  busy?: boolean;
}

/**
 * Lista visual de edição de etapas (renomear, cor, reordenar, excluir).
 * Componente genérico: regras específicas de Entregas ficam fora daqui.
 */
const StageEditorList = ({ stages, onRename, onColorChange, onMove, onDelete, busy }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const firstOpenId = stages.find((s) => s.stage_role === "open")?.id;

  const startEdit = (s: DeliveryStage) => {
    setEditingId(s.id);
    setEditingName(s.name);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    setEditingId(null);
    if (!name) return;
    await onRename(editingId, name);
  };

  return (
    <ul className="space-y-2">
      {stages.map((s, idx) => {
        const isDelivered = s.stage_role === "delivered";
        const isFirstOpen = s.id === firstOpenId;
        const editing = editingId === s.id;
        return (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
          >
            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${deliveryStageColorClass(s.color_key)}`} />

            <div className="min-w-0 flex-1">
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
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  {isFirstOpen && (
                    <p className="text-[11px] text-muted-foreground">Etapa inicial · novas entregas entram aqui</p>
                  )}
                  {isDelivered && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Etapa final · conclui a entrega e não pode ser excluída
                    </p>
                  )}
                </>
              )}
            </div>

            {!editing && (
              <div className="flex items-center gap-1 shrink-0">
                <StageColorPicker
                  value={s.color_key as DeliveryStageColorKey}
                  onChange={(c) => onColorChange(s.id, c)}
                  disabled={busy}
                />
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => onMove(s.id, "up")}
                  disabled={busy || idx === 0 || isDelivered || stages[idx - 1]?.stage_role === "delivered"}
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => onMove(s.id, "down")}
                  disabled={busy || isDelivered || stages[idx + 1]?.stage_role === "delivered" || idx === stages.length - 1}
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => startEdit(s)}
                  disabled={busy}
                  aria-label="Renomear etapa"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                {!isDelivered && (
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(s.id)}
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
  );
};

export default StageEditorList;
