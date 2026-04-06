import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import DatePickerField from "@/components/DatePickerField";
import { useCreateDespesa, useCreateDespesasBatch, useUpdateDespesa, type DespesaInsert, type PaymentMethod, type DespesaStatus, type Despesa } from "@/hooks/useDespesas";
import { useEvents } from "@/hooks/useEvents";

const CATEGORIAS = [
  "Equipamento", "Transporte", "Alimentação", "Software", "Marketing",
  "Aluguel", "Manutenção", "Impostos", "Pessoal", "Outros",
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

interface NovaDespesaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  despesa?: Despesa | null;
}

const NovaDespesaModal = ({ open, onOpenChange, despesa }: NovaDespesaModalProps) => {
  const createDespesa = useCreateDespesa();
  const createBatch = useCreateDespesasBatch();
  const updateDespesa = useUpdateDespesa();
  const { data: events = [] } = useEvents();

  const isEditing = !!despesa;

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [status, setStatus] = useState<DespesaStatus>("paga");
  const [eventoId, setEventoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [parcelada, setParcelada] = useState(false);
  const [numParcelas, setNumParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);

  const isPending = createDespesa.isPending || createBatch.isPending || updateDespesa.isPending;

  useEffect(() => {
    if (despesa) {
      setDescricao(despesa.descricao);
      setValor(despesa.valor.toString());
      setData(despesa.data);
      setCategoria(despesa.categoria);
      setFormaPagamento(despesa.forma_pagamento);
      setStatus(despesa.status);
      setEventoId(despesa.evento_id || "");
      setObservacoes(despesa.observacoes || "");
      setRecorrente(despesa.recorrente);
      setParcelada(false);
    } else {
      resetForm();
    }
  }, [despesa, open]);

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setData("");
    setCategoria("Outros");
    setFormaPagamento("pix");
    setStatus("paga");
    setEventoId("");
    setObservacoes("");
    setParcelada(false);
    setNumParcelas("2");
    setRecorrente(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor || !data) return;

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) return;

    if (isEditing) {
      await updateDespesa.mutateAsync({
        id: despesa!.id,
        descricao: descricao.trim(),
        valor: valorNum,
        data,
        categoria,
        forma_pagamento: formaPagamento,
        status,
        evento_id: eventoId || null,
        observacoes: observacoes.trim() || null,
        recorrente,
      });
      onOpenChange(false);
      return;
    }

    if (parcelada) {
      const parcelas = parseInt(numParcelas) || 2;
      const valorParcela = Math.round((valorNum / parcelas) * 100) / 100;
      const grupoId = crypto.randomUUID();
      const baseDate = new Date(data + "T12:00:00");

      const batch: DespesaInsert[] = Array.from({ length: parcelas }, (_, i) => {
        const parcelaDate = new Date(baseDate);
        parcelaDate.setMonth(parcelaDate.getMonth() + i);
        return {
          descricao: descricao.trim(),
          valor: i === parcelas - 1 ? Math.round((valorNum - valorParcela * (parcelas - 1)) * 100) / 100 : valorParcela,
          data: parcelaDate.toISOString().split("T")[0],
          categoria,
          forma_pagamento: formaPagamento,
          status: "prevista" as DespesaStatus,
          evento_id: eventoId || null,
          observacoes: observacoes.trim() || null,
          parcela_numero: i + 1,
          parcela_total: parcelas,
          grupo_id: grupoId,
          recorrente: false,
        };
      });

      await createBatch.mutateAsync(batch);
    } else {
      await createDespesa.mutateAsync({
        descricao: descricao.trim(),
        valor: valorNum,
        data,
        categoria,
        forma_pagamento: formaPagamento,
        status,
        evento_id: eventoId || null,
        observacoes: observacoes.trim() || null,
        recorrente,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Despesa" : "Adicionar Despesa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Combustível, Aluguel do estúdio..."
              className="bg-muted border-border"
              required
            />
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="flex items-center gap-2 text-sm">
              📅 Evento (opcional)
            </Label>
            <select
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Nenhum evento</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.titulo}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <DatePickerField value={data} onChange={setData} />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Categoria *</Label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Forma de Pagamento *</Label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DespesaStatus)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="paga">Paga</option>
              <option value="prevista">Prevista</option>
            </select>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas adicionais sobre esta despesa..."
              className="bg-muted border-border resize-none"
              rows={2}
            />
          </div>

          {!isEditing && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Despesa Parcelada</p>
                  <p className="text-xs text-muted-foreground">Divide em várias parcelas</p>
                </div>
                <Switch checked={parcelada} onCheckedChange={(v) => { setParcelada(v); if (v) setRecorrente(false); }} />
              </div>

              {parcelada && (
                <div className="space-y-2 pl-4">
                  <Label>Número de parcelas</Label>
                  <Input
                    type="number"
                    min="2"
                    max="48"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(e.target.value)}
                    className="bg-muted border-border w-24"
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Despesa Recorrente</p>
                  <p className="text-xs text-muted-foreground">Repete mensalmente</p>
                </div>
                <Switch checked={recorrente} onCheckedChange={(v) => { setRecorrente(v); if (v) setParcelada(false); }} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaDespesaModal;
