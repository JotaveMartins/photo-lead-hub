import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DatePickerField from "@/components/DatePickerField";
import { useCreateCobranca, useCreateCobrancasBatch } from "@/hooks/useCobrancas";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { PaymentMethod, CobrancaInsert } from "@/hooks/useCobrancas";

type ModalType = "unica" | "parcelas" | "recorrente";

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

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [vencimento, setVencimento] = useState("");
  // Parcelas
  const [numParcelas, setNumParcelas] = useState("3");
  // Recorrente
  const [frequencia, setFrequencia] = useState<"mensal" | "semanal" | "quinzenal">("mensal");
  const [quantidade, setQuantidade] = useState("12");

  const isPending = createCobranca.isPending || createBatch.isPending;

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setFormaPagamento("pix");
    setVencimento("");
    setNumParcelas("3");
    setFrequencia("mensal");
    setQuantidade("12");
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
        });
        toast.success("Cobrança criada com sucesso!");
      } else if (type === "parcelas") {
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
      } else {
        // recorrente
        const qty = parseInt(quantidade);
        if (!qty || qty < 1) {
          toast.error("Informe a quantidade");
          return;
        }
        const grupoId = crypto.randomUUID();
        const items: CobrancaInsert[] = [];
        for (let i = 0; i < qty; i++) {
          const dueDate = new Date(vencimento + "T12:00:00");
          if (frequencia === "mensal") dueDate.setMonth(dueDate.getMonth() + i);
          else if (frequencia === "quinzenal") dueDate.setDate(dueDate.getDate() + i * 15);
          else dueDate.setDate(dueDate.getDate() + i * 7);
          items.push({
            user_id: effectiveUserId,
            tipo: "recorrente",
            grupo_id: grupoId,
            descricao: descricao || null,
            valor: valorNum,
            forma_pagamento: formaPagamento,
            vencimento: dueDate.toISOString().split("T")[0],
            parcela_numero: i + 1,
            parcela_total: qty,
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
    recorrente: "Cobrança Recorrente",
  };

  const subtitles: Record<ModalType, string> = {
    unica: "Crie uma nova cobrança em segundos",
    parcelas: "Configure o parcelamento do pagamento",
    recorrente: "Configure cobranças recorrentes",
  };

  // Preview for recorrente
  const previewDates = () => {
    if (!vencimento) return [];
    const qty = parseInt(quantidade) || 0;
    const dates: string[] = [];
    for (let i = 0; i < Math.min(qty, 6); i++) {
      const d = new Date(vencimento + "T12:00:00");
      if (frequencia === "mensal") d.setMonth(d.getMonth() + i);
      else if (frequencia === "quinzenal") d.setDate(d.getDate() + i * 15);
      else d.setDate(d.getDate() + i * 7);
      dates.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }));
    }
    return dates;
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
              placeholder={type === "recorrente" ? "Ex: Mensalidade, Assinatura..." : "Ex: Entrada, Serviço fotográfico..."}
              className="bg-muted border-border"
              required={type !== "unica"}
            />
          </div>

          <div className="space-y-2">
            <Label>{type === "parcelas" ? "Valor Total *" : type === "recorrente" ? "Valor por cobrança *" : "Valor *"}</Label>
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

          {type === "recorrente" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <select
                    value={frequencia}
                    onChange={(e) => setFrequencia(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Início *</Label>
                  <DatePickerField value={vencimento} onChange={setVencimento} placeholder="Selecione" />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="bg-muted border-border"
                    required
                  />
                </div>
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
              {vencimento && parseInt(quantidade) > 0 && (
                <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Prévia das cobranças ({frequencia === "mensal" ? "Mensal" : frequencia === "quinzenal" ? "Quinzenal" : "Semanal"})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {previewDates().map((d, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{d}</span>
                    ))}
                    {parseInt(quantidade) > 6 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        +{parseInt(quantidade) - 6} mais
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total: {quantidade} cobranças de R$ {parseFloat(valor || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = <strong>R$ {(parseFloat(valor || "0") * parseInt(quantidade || "0")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              )}
            </>
          )}

          {type === "unica" && (
            <>
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
            </>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={isPending}>
              {isPending ? "Criando..." : type === "recorrente" ? "Criar cobranças" : type === "parcelas" ? "Salvar" : "Criar cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaCobrancaModal;
