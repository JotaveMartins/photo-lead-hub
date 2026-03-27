import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import InteresseSelect from "@/components/InteresseSelect";
import DatePickerField from "@/components/DatePickerField";

interface RequiredFieldsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  targetStatus: string;
  currentValor: number | null;
  currentDataProposta: string | null;
  currentDataEvento: string | null;
  currentInteresse: string | null;
  currentOrigem: string | null;
  onConfirm: (fields: { valor: number; data_proposta?: string; data_evento?: string; interesse?: string; origem?: string }) => void;
  isPending?: boolean;
}

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

const RequiredFieldsModal = ({
  open, onOpenChange, leadName, targetStatus,
  currentValor, currentDataProposta, currentDataEvento, currentInteresse, currentOrigem,
  onConfirm, isPending = false,
}: RequiredFieldsModalProps) => {
  const [valor, setValor] = useState(currentValor?.toString() || "");
  const [dataProposta, setDataProposta] = useState(currentDataProposta || "");
  const [dataEvento, setDataEvento] = useState(currentDataEvento || "");
  const [interesse, setInteresse] = useState(currentInteresse || "");
  const [origem, setOrigem] = useState(currentOrigem || "");

  useEffect(() => {
    setValor(currentValor?.toString() || "");
    setDataProposta(currentDataProposta || "");
    setDataEvento(currentDataEvento || "");
    setInteresse(currentInteresse || "");
    setOrigem(currentOrigem || "");
  }, [currentValor, currentDataProposta, currentDataEvento, currentInteresse, currentOrigem, open]);

  const isProposal = targetStatus === "Proposta Enviada" || targetStatus === "Follow-up";

  const needsValor = !currentValor || currentValor <= 0;
  const needsDataProposta = isProposal && !currentDataProposta;
  const needsDataEvento = isProposal && !currentDataEvento;
  const needsInteresse = isProposal && !currentInteresse;
  const needsOrigem = isProposal && !currentOrigem;

  const canSubmit = () => {
    if (needsValor && (!valor || parseFloat(valor) <= 0)) return false;
    if (needsDataProposta && !dataProposta) return false;
    if (needsDataEvento && !dataEvento) return false;
    if (needsInteresse && !interesse.trim()) return false;
    if (needsOrigem && !origem) return false;
    return true;
  };

  const handleConfirm = () => {
    const parsed = parseFloat(valor);
    if (needsValor && (!parsed || parsed <= 0)) return;
    onConfirm({
      valor: parsed || currentValor || 0,
      ...(needsDataProposta && dataProposta ? { data_proposta: dataProposta } : {}),
      ...(needsDataEvento && dataEvento ? { data_evento: dataEvento } : {}),
      ...(needsInteresse && interesse ? { interesse } : {}),
      ...(needsOrigem && origem ? { origem } : {}),
    });
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
          {needsValor && (
            <div className="space-y-2">
              <Label>Valor do negócio (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="Ex: 5000" value={valor}
                onChange={(e) => setValor(e.target.value)} className="bg-muted border-border" autoFocus />
            </div>
          )}

          {needsDataProposta && (
            <div className="space-y-2">
              <Label>Data da Proposta <span className="text-destructive">*</span></Label>
              <DatePickerField value={dataProposta} onChange={setDataProposta} placeholder="Selecione" />
            </div>
          )}

          {needsDataEvento && (
            <div className="space-y-2">
              <Label>Data do Evento <span className="text-destructive">*</span></Label>
              <DatePickerField value={dataEvento} onChange={setDataEvento} placeholder="Selecione" />
            </div>
          )}

          {needsInteresse && (
            <div className="space-y-2">
              <Label>Interesse <span className="text-destructive">*</span></Label>
              <InteresseSelect value={interesse} onValueChange={setInteresse} />
            </div>
          )}

          {needsOrigem && (
            <div className="space-y-2">
              <Label>Origem <span className="text-destructive">*</span></Label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Selecione</option>
                {ORIGEM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!canSubmit() || isPending} className="bg-gradient-primary hover:opacity-90">
              {isPending ? "Movendo..." : "Confirmar e mover"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequiredFieldsModal;
