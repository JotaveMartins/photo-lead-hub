import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import SearchSelect from "@/components/SearchSelect";
import DatePickerField from "@/components/DatePickerField";
import TimePickerField from "@/components/TimePickerField";
import { useClientes } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import { usePackages } from "@/hooks/usePackages";
import { useCreateContrato, useUpdateContrato, type Contrato } from "@/hooks/useContratos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NovoContratoDefaults {
  cliente_id?: string | null;
  lead_id?: string | null;
  nome_cliente?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  endereco_cliente?: string | null;
  tipo_servico?: string | null;
  pacote?: string | null;
  data_evento?: string | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  local_evento?: string | null;
  valor?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: NovoContratoDefaults;
  /** Cliente fixo (ficha do cliente / fluxo de lead ganho). */
  lockCliente?: boolean;
  onCreated?: (contrato: Contrato) => void;
}

const FORMAS = ["Pix", "Cartão", "Boleto", "Transferência", "Dinheiro"].map((f) => ({ value: f, label: f }));

const empty = {
  cliente_id: "", nome_cliente: "", cpf_cnpj: "", email: "", whatsapp: "", endereco_cliente: "",
  tipo_servico: "", pacote: "", data_evento: "", horario_inicio: "", horario_fim: "",
  local_evento: "", valor: "", forma_pagamento: "", observacoes: "",
};

const NovoContratoDialog = ({ open, onOpenChange, defaults, lockCliente, onCreated }: Props) => {
  const { data: clientes = [] } = useClientes();
  const { data: services = [] } = useServices();
  const { data: packages = [] } = usePackages();
  const createContrato = useCreateContrato();
  const updateContrato = useUpdateContrato();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const d = defaults || {};
    const next = { ...empty };
    (Object.keys(empty) as (keyof typeof empty)[]).forEach((k) => {
      const v = (d as any)[k];
      if (v !== undefined && v !== null) next[k] = String(v);
    });
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Preenche dados do cliente quando carregar/selecionar (sem sobrescrever o que já foi digitado)
  const applyCliente = (id: string, overwrite: boolean) => {
    const c: any = clientes.find((x: any) => x.id === id);
    setForm((f) => {
      if (!c) return { ...f, cliente_id: id };
      const pick = (cur: string, val: any) => (overwrite || !cur ? (val ?? cur ?? "") : cur);
      return {
        ...f,
        cliente_id: id,
        nome_cliente: pick(f.nome_cliente, c.nome),
        cpf_cnpj: pick(f.cpf_cnpj, c.cpf_cnpj),
        email: pick(f.email, c.email),
        whatsapp: pick(f.whatsapp, c.whatsapp),
        endereco_cliente: pick(f.endereco_cliente, c.endereco),
      };
    });
  };

  useEffect(() => {
    if (open && form.cliente_id && clientes.length) applyCliente(form.cliente_id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientes.length, defaults?.cliente_id]);

  const serviceOptions = useMemo(
    () => services.filter((s: any) => s.ativo).map((s: any) => ({ value: s.nome, label: s.nome })),
    [services],
  );
  const packageOptions = useMemo(() => packages.map((p: any) => ({ value: p.nome, label: p.nome })), [packages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_cliente.trim()) { toast.error("Informe o nome do cliente."); return; }
    setSaving(true);
    try {
      const payload: any = {
        cliente_id: form.cliente_id || null,
        lead_id: defaults?.lead_id || null,
        nome_cliente: form.nome_cliente.trim(),
        cpf_cnpj: form.cpf_cnpj || null,
        email: form.email || null,
        whatsapp: form.whatsapp || null,
        endereco_cliente: form.endereco_cliente || null,
        tipo_servico: form.tipo_servico || null,
        pacote: form.pacote || null,
        data_evento: form.data_evento || null,
        horario_inicio: form.horario_inicio || null,
        horario_fim: form.horario_fim || null,
        local_evento: form.local_evento || null,
        valor: form.valor ? Number(String(form.valor).replace(",", ".")) : null,
        forma_pagamento: form.forma_pagamento || null,
        observacoes: form.observacoes || null,
      };
      // Evita duplicar: se o lead já tem contrato ativo, atualiza em vez de criar.
      let existingId: string | null = null;
      if (payload.lead_id) {
        const { data } = await supabase.from("contratos").select("id")
          .eq("lead_id", payload.lead_id).is("deleted_at", null).limit(1).maybeSingle();
        existingId = data?.id ?? null;
      }
      const result = existingId
        ? await updateContrato.mutateAsync({ id: existingId, ...payload })
        : await createContrato.mutateAsync({ ...payload, status: "aguardando_contrato" });
      toast.success(existingId ? "Contrato atualizado." : "Contrato criado.");
      onCreated?.(result as Contrato);
      onOpenChange(false);
    } catch {
      // toasts de erro já tratados nos hooks
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>O contrato começa em "Aguardando Contrato". O arquivo pode ser anexado depois.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {lockCliente && form.cliente_id ? (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <div className="h-10 px-3 flex items-center rounded-md border border-border bg-muted text-sm">
                    {(clientes as any[]).find((c) => c.id === form.cliente_id)?.nome || form.nome_cliente || "Cliente"}
                  </div>
                </div>
              ) : (
                <ClienteSearchSelect
                  clientes={clientes as any}
                  value={form.cliente_id}
                  onChange={(id) => (id ? applyCliente(id, true) : set("cliente_id", ""))}
                  label="Cliente"
                  allowEmpty
                  emptyLabel="Sem cliente vinculado"
                />
              )}
            </div>
            {/* Chamadas diretas (não componentes) para não perder o foco dos inputs ao digitar */}
            {Field({ label: "Nome *", full: true, children: <Input value={form.nome_cliente} onChange={(e) => set("nome_cliente", e.target.value)} /> })}
            {Field({ label: "CPF/CNPJ", children: <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} /> })}
            {Field({ label: "E-mail", children: <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /> })}
            {Field({ label: "WhatsApp", children: <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /> })}
            {Field({ label: "Endereço", children: <Input value={form.endereco_cliente} onChange={(e) => set("endereco_cliente", e.target.value)} /> })}
            <SearchSelect options={serviceOptions} value={form.tipo_servico} onChange={(v) => set("tipo_servico", v)} label="Tipo de serviço" allowEmpty />
            <SearchSelect options={packageOptions} value={form.pacote} onChange={(v) => set("pacote", v)} label="Pacote" allowEmpty />
            {Field({ label: "Data do evento", children: <DatePickerField value={form.data_evento} onChange={(v) => set("data_evento", v)} /> })}
            {Field({ label: "Local", children: <Input value={form.local_evento} onChange={(e) => set("local_evento", e.target.value)} /> })}
            {Field({ label: "Horário início", children: <TimePickerField value={form.horario_inicio} onChange={(v) => set("horario_inicio", v)} /> })}
            {Field({ label: "Horário fim", children: <TimePickerField value={form.horario_fim} onChange={(v) => set("horario_fim", v)} /> })}
            {Field({ label: "Valor (R$)", children: <Input inputMode="decimal" value={form.valor} onChange={(e) => set("valor", e.target.value)} /> })}
            <SearchSelect options={FORMAS} value={form.forma_pagamento} onChange={(v) => set("forma_pagamento", v)} label="Forma de pagamento" allowEmpty />
            {Field({ label: "Observações", full: true, children: <Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /> })}
          </div>
          <FormActions onCancel={() => onOpenChange(false)} loading={saving} submitLabel="Criar contrato" loadingLabel="Salvando..." />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoContratoDialog;
