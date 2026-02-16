import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface RequiredFieldsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  targetStatus: string;
  currentValor: number | null;
  onConfirm: (fields: { valor: number }) => void;
}

const RequiredFieldsModal = ({
  open, onOpenChange, leadName, targetStatus, currentValor, onConfirm,
}: RequiredFieldsModalProps) => {
  const [valor, setValor] = useState(currentValor?.toString() || "");

  useEffect(() => {
    setValor(currentValor?.toString() || "");
  }, [currentValor, open]);

  const handleConfirm = () => {
    const parsed = parseFloat(valor);
    if (!parsed || parsed <= 0) return;
    onConfirm({ valor: parsed });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Campos obrigatórios
          </DialogTitle>
          <DialogDescription>
            Para mover <span className="font-semibold text-foreground">{leadName}</span> para{" "}
            <span className="font-semibold text-foreground">{targetStatus}</span>, preencha os campos abaixo:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Valor do negócio (R$) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 5000"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="bg-muted border-border"
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={!valor || parseFloat(valor) <= 0}
              className="bg-gradient-primary hover:opacity-90"
            >
              Confirmar e mover
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequiredFieldsModal;
