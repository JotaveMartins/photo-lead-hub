import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePickerField from "@/components/DatePickerField";
import { useUpdateCobranca } from "@/hooks/useCobrancas";
import { toast } from "sonner";
import SearchSelect from "@/components/SearchSelect";
import { FormActions } from "@/components/ui/form-actions";
import type { Cobranca, PaymentMethod } from "@/hooks/useCobrancas";
import CobrancaItemSelector from "./CobrancaItemSelector";

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
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (cobranca) {
      setDescricao(cobranca.descricao || "");
      setValor(cobranca.valor.toString());
      setFormaPagamento(cobranca.forma_pagamento);
      setVencimento(cobranca.vencimento.substring(0, 10));
      setServiceId(cobranca.service_id ?? null);
      setPackageId(cobranca.package_id ?? null);
    }
  }, [cobranca]);

  // Nome histórico do item vinculado (inclui arquivados, que não aparecem na lista ativa)
  const { data: linkedName } = useQuery({
    queryKey: ["cobranca-item-name", serviceId, packageId],
    enabled: open && !!(serviceId || packageId),
    queryFn: async () => {
      if (serviceId) {
        const { data } = await supabase.from("services").select("nome").eq("id", serviceId).maybeSingle();
        return data?.nome ?? null;
      }
      const { data } = await supabase.from("packages").select("nome").eq("id", packageId!).maybeSingle();
      return data?.nome ?? null;
    },
  });

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
        service_id: serviceId,
        package_id: packageId,
      });
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
          <CobrancaItemSelector
            serviceId={serviceId}
            packageId={packageId}
            fallbackName={linkedName ?? undefined}
            onSelect={(item) => {
              // Trocar o item não sobrescreve descrição/valor (snapshot histórico)
              setServiceId(item.type === "service" ? item.id : null);
              setPackageId(item.type === "package" ? item.id : null);
            }}
            onClear={() => { setServiceId(null); setPackageId(null); }}
          />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <DatePickerField value={vencimento} onChange={setVencimento} placeholder="Selecione" />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <SearchSelect value={formaPagamento} onChange={(v) => setFormaPagamento((v || "pix") as PaymentMethod)} allowEmpty={false} options={PAYMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
          </div>

          <FormActions className="pt-4 border-t border-border" onCancel={() => onOpenChange(false)} loading={updateCobranca.isPending} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCobrancaModal;
