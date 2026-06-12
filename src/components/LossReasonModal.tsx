import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchSelect from "./SearchSelect";

const LOSS_REASONS = [
  "Sem orçamento disponível",
  "Fechou com outro fotógrafo",
  "Sem resposta",
  "Cancelou ou adiou o evento",
  "Data indisponível",
  "Lead desqualificado",
  "Outro",
];

interface LossReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (data: { motivo_perda: string; observacao_perda: string | null; deleteFutureTasks: boolean }) => void;
  hasFutureTasks?: boolean;
}

const LossReasonModal = ({ open, onOpenChange, leadName, onConfirm, hasFutureTasks = false }: LossReasonModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [deleteFutureTasks, setDeleteFutureTasks] = useState(true);

  const handleConfirm = () => {
    if (!motivo) return;
    onConfirm({
      motivo_perda: motivo,
      observacao_perda: observacao.trim() || null,
      deleteFutureTasks,
    });
    setMotivo("");
    setObservacao("");
    setDeleteFutureTasks(true);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMotivo("");
      setObservacao("");
      setDeleteFutureTasks(true);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Motivo da perda — {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Motivo *</Label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Selecione o motivo</option>
              {LOSS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação sobre a perda..."
              className="bg-muted border-border min-h-[80px]"
            />
          </div>

          {hasFutureTasks && (
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Tarefas futuras pendentes</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="radio"
                    name="future-tasks"
                    checked={deleteFutureTasks}
                    onChange={() => setDeleteFutureTasks(true)}
                    className="mt-0.5"
                  />
                  <span>Excluir tarefas futuras deste lead</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="radio"
                    name="future-tasks"
                    checked={!deleteFutureTasks}
                    onChange={() => setDeleteFutureTasks(false)}
                    className="mt-0.5"
                  />
                  <span>Manter tarefas futuras</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!motivo}
            className="bg-gradient-primary hover:opacity-90"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LossReasonModal;
