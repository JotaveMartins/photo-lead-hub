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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  onConfirm: (data: { motivo_perda: string; observacao_perda: string | null }) => void;
}

const LossReasonModal = ({ open, onOpenChange, leadName, onConfirm }: LossReasonModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleConfirm = () => {
    if (!motivo) return;
    onConfirm({
      motivo_perda: motivo,
      observacao_perda: observacao.trim() || null,
    });
    setMotivo("");
    setObservacao("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMotivo("");
      setObservacao("");
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
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger className="bg-muted border-border">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
