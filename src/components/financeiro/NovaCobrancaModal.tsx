import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePickerField from "@/components/DatePickerField";
import { useCreateCobranca, useCreateCobrancasBatch } from "@/hooks/useCobrancas";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useClientes } from "@/hooks/useClientes";
import { toast } from "sonner";
import type { PaymentMethod, CobrancaInsert } from "@/hooks/useCobrancas";

type ModalType = "unica" | "parcelas";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

interface NovaCobrancaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ModalType;
}

const NovaCobrancaModal = ({ open, onOpenChange, type }: NovaCobrancaModalProps) => {
  const effectiveUserId = useEffectiveUserId();
  const createCobranca = useCreateCobranca();
  const createBatch = useCreateCobrancasBatch();
  const { data: clientes = [] } = useClientes();

  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [vencimento, setVencimento] = useState("");
  const [numParcelas, setNumParcelas] = useState("3");

  const isPending = createCobranca.isPending || createBatch.isPending;

  const resetForm = () => {
    setClienteId("");
    setDescricao("");
    setValor("");
    setFormaPagamento("pix");
    setVencimento("");
    setNumParcelas("3");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) return;

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!vencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    try {
      if (type === "unica") {
        await createCobranca.mutateAsync({
          user_id: effectiveUserId,
          tipo: "unica",
          descricao: descricao || null,
          valor: valorNum,
          forma_pagamento: formaPagamento,
          vencimento,
          cliente_id: clienteId || null,
        } as any);
        toast.success("Cobrança criada com sucesso!");
      } else {
        const n = parseInt(numParcelas);
        if (!n || n < 2) {
          toast.error("Informe pelo menos 2 parcelas");
          return;
        }
        const valorParcela = Math.round((valorNum / n) * 100) / 100;
        const grupoId = crypto.randomUUID();
        const items: CobrancaInsert[] = [];
        for (let i = 0; i < n; i++) {
          const dueDate = new Date(vencimento + "T12:00:00");
          dueDate.setMonth(dueDate.getMonth() + i);
          items.push({
            user_id: effectiveUserId,
            tipo: "parcela",
            grupo_id: grupoId,
            descricao: descricao || null,
            valor: valorParcela,
            forma_pagamento: formaPagamento,
            vencimento: dueDate.toISOString().split("T")[0],
            parcela_numero: i + 1,
            parcela_total: n,
          });
        }
        await createBatch.mutateAsync(items);
      }
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Erro ao criar cobrança");
    }
  };

  const titles: Record<ModalType, string> = {
    unica: "Nova Cobrança",
    parcelas: "Criar Parcelas",
  };

  const subtitles: Record<ModalType, string> = {
    unica: "Crie uma nova cobrança em segundos",
    parcelas: "Configure o parcelamento do pagamento",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{titles[type]}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitles[type]}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Descrição{type !== "unica" ? " *" : ""}</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Entrada, Serviço fotográfico..."
              className="bg-muted border-border"
              required={type !== "unica"}
            />
          </div>

          <div className="space-y-2">
            <Label>{type === "parcelas" ? "Valor Total *" : "Valor *"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="bg-muted border-border pl-10 text-right"
                required
              />
            </div>
          </div>

          {type === "parcelas" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <select
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>1º Vencimento *</Label>
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
          )}

          {type === "unica" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <DatePickerField value={vencimento} onChange={setVencimento} placeholder="dd/mm/aaaa" />
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
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={isPending}>
              {isPending ? "Criando..." : type === "parcelas" ? "Salvar" : "Criar cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaCobrancaModal;
