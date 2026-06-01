import { useState, useMemo, useRef, useEffect } from "react";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePickerField from "@/components/DatePickerField";
import SearchSelect from "@/components/SearchSelect";
import { parseLocalDate } from "@/lib/utils";
import { useCreateCobranca, useCreateCobrancasBatch } from "@/hooks/useCobrancas";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useClientes } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import { usePackages } from "@/hooks/usePackages";
import { usePackageServicesForPackage } from "@/hooks/usePackageServices";
import { useIntegrationSettings, useAsaasCreateCharge } from "@/hooks/useIntegrationSettings";
import { toast } from "sonner";
import ServiceModal from "@/components/ServiceModal";
import PackageModal from "@/components/PackageModal";
import { Plus, Zap, Copy, ExternalLink } from "lucide-react";
import type { PaymentMethod, CobrancaInsert } from "@/hooks/useCobrancas";

type ModalType = "unica" | "parcelas" | "entrada_parcelas";

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
  initialClienteId?: string;
  initialValor?: number;
  lockOutsideClose?: boolean;
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

const NovaCobrancaModal = ({ open, onOpenChange, type, initialClienteId, initialValor, lockOutsideClose, headerExtra, footerExtra }: NovaCobrancaModalProps) => {
  const effectiveUserId = useEffectiveUserId();
  const createCobranca = useCreateCobranca();
  const createBatch = useCreateCobrancasBatch();
  const asaasCreateCharge = useAsaasCreateCharge();
  const { data: integrations } = useIntegrationSettings();
  const hasAsaas = !!integrations?.asaas_api_key;
  const { data: clientes = [] } = useClientes();

  const [clienteId, setClienteId] = useState(initialClienteId || "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(initialValor ? String(initialValor) : "");
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("pix");
  const [vencimento, setVencimento] = useState("");
  const [numParcelas, setNumParcelas] = useState("3");

  // Entrada + Parcelas specific
  const [valorEntrada, setValorEntrada] = useState("");
  const [formaPagamentoEntrada, setFormaPagamentoEntrada] = useState<PaymentMethod>("pix");
  const [vencimentoEntrada, setVencimentoEntrada] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [enviarAsaas, setEnviarAsaas] = useState(false);
  const [jaPago, setJaPago] = useState(false);
  const [jaPagoEntrada, setJaPagoEntrada] = useState(false);

  // Sync props
  useEffect(() => {
    if (initialClienteId) setClienteId(initialClienteId);
  }, [initialClienteId]);

  useEffect(() => {
    if (initialValor) setValor(String(initialValor));
  }, [initialValor]);

  const isPending = createCobranca.isPending || createBatch.isPending || asaasCreateCharge.isPending;

  const resetForm = () => {
    setClienteId("");
    setDescricao("");
    setValor("");
    setFormaPagamento("pix");
    setVencimento("");
    setNumParcelas("3");
    setValorEntrada("");
    setFormaPagamentoEntrada("pix");
    setVencimentoEntrada("");
    setSelectedItemName("");
    setEnviarAsaas(false);
    setJaPago(false);
    setJaPagoEntrada(false);
  };

  const syncAsaas = async (ids: string[]) => {
    if (!enviarAsaas || !ids.length) return;
    const results = await Promise.allSettled(ids.map((id) => asaasCreateCharge.mutateAsync(id)));
    const successes = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
    const failures = results.filter((r) => r.status === "rejected").length;

    if (failures > 0) {
      const firstError = (results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined)?.reason;
      const msg = firstError?.message || "Erro desconhecido";
      toast.error(`Erro ao enviar ao Asaas: ${msg}`, { duration: 8000 });
    }
    if (successes.length > 0) {
      const link = successes[0].value?.invoice_url;
      const pixCode = successes[0].value?.pix_code;
      if (link) {
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">Cobrança enviada ao Asaas!</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(link, "_blank")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Abrir link
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado!"); }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copiar link
              </button>
            </div>
          </div>,
          { duration: 8000 }
        );
      } else if (pixCode) {
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">PIX criado no Asaas!</p>
            <button
              onClick={() => { navigator.clipboard.writeText(pixCode); toast.success("Código PIX copiado!"); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copiar código PIX
            </button>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success(`${successes.length} cobrança(s) enviada(s) ao Asaas!`);
      }
    }
  };

  // Computed values for entrada+parcelas preview
  const valorTotal = parseFloat(valor) || 0;
  const entradaNum = parseFloat(valorEntrada) || 0;
  const restante = Math.max(0, valorTotal - entradaNum);
  const nParcelas = parseInt(numParcelas) || 2;
  const valorParcela = nParcelas > 0 ? Math.round((restante / nParcelas) * 100) / 100 : 0;

  const isPastDate = (d: string) => {
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parseLocalDate(d) < today;
  };
  const vencimentoPast = isPastDate(vencimento);
  const vencimentoEntradaPast = isPastDate(vencimentoEntrada);

  useEffect(() => { if (!vencimentoPast) setJaPago(false); }, [vencimentoPast]);
  useEffect(() => { if (!vencimentoEntradaPast) setJaPagoEntrada(false); }, [vencimentoEntradaPast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) return;

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      if (type === "unica") {
        if (!vencimento) { toast.error("Informe a data de vencimento"); return; }
        const result = await createCobranca.mutateAsync({
          user_id: effectiveUserId,
          tipo: "unica",
          descricao: descricao || null,
          valor: valorNum,
          forma_pagamento: formaPagamento,
          vencimento,
          cliente_id: clienteId || null,
          ...(jaPago && vencimentoPast ? { status: "paga" as const, data_pagamento: vencimento } : {}),
        } as any);
        toast.success("Cobrança criada com sucesso!");
        if (result?.id) await syncAsaas([result.id]);
      } else if (type === "parcelas") {
        if (!vencimento) { toast.error("Informe a data de vencimento"); return; }
        const n = parseInt(numParcelas);
        if (!n || n < 2) { toast.error("Informe pelo menos 2 parcelas"); return; }
        const vp = Math.round((valorNum / n) * 100) / 100;
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
            valor: vp,
            forma_pagamento: formaPagamento,
            vencimento: dueDate.toISOString().split("T")[0],
            parcela_numero: i + 1,
            parcela_total: n,
            cliente_id: clienteId || null,
          } as any);
        }
        const batchResult = await createBatch.mutateAsync(items);
        if (batchResult?.length) await syncAsaas(batchResult.map((c: any) => c.id));
      } else if (type === "entrada_parcelas") {
        if (!vencimentoEntrada) { toast.error("Informe a data da entrada"); return; }
        if (!vencimento) { toast.error("Informe a data do 1º vencimento das parcelas"); return; }
        if (entradaNum <= 0) { toast.error("Informe o valor da entrada"); return; }
        if (entradaNum >= valorNum) { toast.error("A entrada deve ser menor que o valor total"); return; }
        const n = parseInt(numParcelas);
        if (!n || n < 1) { toast.error("Informe pelo menos 1 parcela"); return; }

        const grupoId = crypto.randomUUID();
        const items: CobrancaInsert[] = [];

        // Entrada
        items.push({
          user_id: effectiveUserId,
          tipo: "unica",
          grupo_id: grupoId,
          descricao: descricao ? `Entrada - ${descricao}` : "Entrada",
          valor: entradaNum,
          forma_pagamento: formaPagamentoEntrada,
          vencimento: vencimentoEntrada,
          cliente_id: clienteId || null,
          ...(jaPagoEntrada && vencimentoEntradaPast ? { status: "paga" as const, data_pagamento: vencimentoEntrada } : {}),
        } as any);

        // Parcelas
        const vp = Math.round((restante / n) * 100) / 100;
        for (let i = 0; i < n; i++) {
          const dueDate = new Date(vencimento + "T12:00:00");
          dueDate.setMonth(dueDate.getMonth() + i);
          items.push({
            user_id: effectiveUserId,
            tipo: "parcela",
            grupo_id: grupoId,
            descricao: descricao || null,
            valor: vp,
            forma_pagamento: formaPagamento,
            vencimento: dueDate.toISOString().split("T")[0],
            parcela_numero: i + 1,
            parcela_total: n,
            cliente_id: clienteId || null,
          } as any);
        }
        const batchResult2 = await createBatch.mutateAsync(items);
        if (batchResult2?.length) await syncAsaas(batchResult2.map((c: any) => c.id));
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
    entrada_parcelas: "Entrada + Parcelas",
  };

  const subtitles: Record<ModalType, string> = {
    unica: "Crie uma nova cobrança em segundos",
    parcelas: "Configure o parcelamento do pagamento",
    entrada_parcelas: "Entrada avulsa + parcelas do restante",
  };

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && lockOutsideClose) return; onOpenChange(v); }}>
      <DialogContent
        className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => { if (lockOutsideClose) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{titles[type]}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitles[type]}</p>
          {headerExtra}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ClienteSearchSelect
            clientes={clientes}
            value={clienteId}
            onChange={setClienteId}
          />

          <ItemSelector
            onSelect={(name, price) => {
              setDescricao(name);
              setValor(String(price));
              setSelectedItemName(name);
            }}
            selectedName={selectedItemName}
          />

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
            <Label>{type === "unica" ? "Valor *" : "Valor Total *"}</Label>
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

          {/* ===== ENTRADA + PARCELAS ===== */}
          {type === "entrada_parcelas" && (
            <>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Entrada</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Valor da Entrada *</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-primary font-semibold text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorEntrada}
                        onChange={(e) => setValorEntrada(e.target.value)}
                        placeholder="0,00"
                        className="bg-muted border-border pl-8 text-right text-sm h-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vencimento *</Label>
                    <DatePickerField value={vencimentoEntrada} onChange={setVencimentoEntrada} placeholder="Selecione" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pagamento</Label>
                    <select
                      value={formaPagamentoEntrada}
                      onChange={(e) => setFormaPagamentoEntrada(e.target.value as PaymentMethod)}
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {PAYMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Parcelas do restante</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Nº Parcelas</Label>
                    <select
                      value={numParcelas}
                      onChange={(e) => setNumParcelas(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">1º Vencimento *</Label>
                    <DatePickerField value={vencimento} onChange={setVencimento} placeholder="Selecione" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pagamento</Label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {PAYMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {valorTotal > 0 && entradaNum > 0 && entradaNum < valorTotal && (
                <div className="p-3 rounded-lg bg-muted border border-border text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrada</span>
                    <span className="font-medium text-foreground">{formatCurrency(entradaNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{nParcelas}x parcelas</span>
                    <span className="font-medium text-foreground">{formatCurrency(valorParcela)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-bold text-primary">{formatCurrency(entradaNum + valorParcela * nParcelas)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== PARCELAS ONLY ===== */}
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

          {/* ===== UNICA ONLY ===== */}
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

          {hasAsaas && (
            <div
              onClick={() => setEnviarAsaas((v) => !v)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${enviarAsaas ? "border-blue-500/40 bg-blue-500/5" : "border-border bg-muted/30 hover:bg-muted/60"}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${enviarAsaas ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                A$
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  Gerar cobrança no Asaas
                </p>
                <p className="text-xs text-muted-foreground">
                  {enviarAsaas ? "Será enviada ao Asaas e você receberá o link de pagamento" : "Clique para ativar"}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${enviarAsaas ? "bg-blue-500" : "bg-muted"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${enviarAsaas ? "left-5" : "left-0.5"}`} />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            {footerExtra}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={isPending}>
              {isPending ? "Criando..." : "Criar cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


interface ItemSelectorProps {
  onSelect: (name: string, price: number) => void;
  selectedName: string;
}

const ItemSelector = ({ onSelect, selectedName }: ItemSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { data: services = [] } = useServices();
  const { data: packages = [] } = usePackages();
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const s = search.toLowerCase();
  const filteredServices = services.filter((sv) => sv.nome.toLowerCase().includes(s));
  const filteredPackages = packages.filter((p) => !p.is_default && p.nome.toLowerCase().includes(s));

  return (
    <div className="space-y-2">
      <Label>Serviço ou Pacote <span className="text-muted-foreground text-xs">opcional</span></Label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedName ? "text-foreground" : "text-muted-foreground"}`}
        >
          {selectedName || "Vincular serviço ou pacote..."}
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            <div className="p-2">
              <div className="relative">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço ou pacote..."
                  className={`w-full rounded-md border border-input bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${search ? "pr-8" : ""}`}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredServices.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">Serviços</p>
                  {filteredServices.map((sv) => (
                    <button
                      type="button"
                      key={`s-${sv.id}`}
                      onClick={() => { onSelect(sv.nome, sv.valor_base); setOpen(false); setSearch(""); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="text-foreground">{sv.nome}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(sv.valor_base)}</span>
                    </button>
                  ))}
                </>
              )}
              {filteredPackages.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">Pacotes</p>
                  {filteredPackages.map((p) => (
                    <button
                      type="button"
                      key={`p-${p.id}`}
                      onClick={() => { onSelect(p.nome, p.preco_final || 0); setOpen(false); setSearch(""); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="text-foreground">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">{p.preco_final ? formatCurrency(p.preco_final) : "—"}</span>
                    </button>
                  ))}
                </>
              )}
              {filteredServices.length === 0 && filteredPackages.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground text-center">Nenhum item encontrado</p>
              )}
            </div>
            <div className="border-t border-border p-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => { setOpen(false); setServiceModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Novo serviço
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setPackageModalOpen(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Novo pacote
              </button>
            </div>
          </div>
        )}
      </div>
      <ServiceModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        onCreated={() => { setServiceModalOpen(false); setOpen(true); }}
      />
      <PackageModal
        open={packageModalOpen}
        onOpenChange={setPackageModalOpen}
        onCreated={() => { setPackageModalOpen(false); setOpen(true); }}
      />
    </div>
  );
};

export default NovaCobrancaModal;
