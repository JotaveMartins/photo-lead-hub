import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePickerField from "@/components/DatePickerField";
import { useUpdateCobranca } from "@/hooks/useCobrancas";
import { toast } from "sonner";
import type { Cobranca, PaymentMethod } from "@/hooks/useCobrancas";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

interface EditCobrancaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobranca: Cobranca | null;
}

const EditCobrancaModal = ({ open, onOpenChange, cobranca }: EditCobrancaModalProps) => {
  const updateCobranca = useUpdateCobranca();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [vencimento, setVencimento] = useState("");

  useEffect(() => {
    if (cobranca) {
      setDescricao(cobranca.descricao || "");
      setValor(cobranca.valor.toString());
      setFormaPagamento(cobranca.forma_pagamento);
      setVencimento(cobranca.vencimento.substring(0, 10));
    }
  }, [cobranca]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobranca) return;

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await updateCobranca.mutateAsync({
        id: cobranca.id,
        descricao: descricao || null,
        valor: valorNum,
        forma_pagamento: formaPagamento,
        vencimento,
      } as any);
      toast.success("Cobrança atualizada!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar cobrança");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Editar Cobrança</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Valor *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm">R$</span>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="bg-muted border-border pl-10 text-right"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <DatePickerField value={vencimento} onChange={setVencimento} placeholder="Selecione" />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateCobranca.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={updateCobranca.isPending}>
              {updateCobranca.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCobrancaModal;
