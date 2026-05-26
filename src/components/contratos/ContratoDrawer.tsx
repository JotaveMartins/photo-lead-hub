import { useRef, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Save, Upload, ExternalLink, CheckCircle2, X,
  Calendar, Clock, MapPin, DollarSign, FileText, User, Phone, Mail,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";
import { useUpdateContrato, useUploadContratoFile, type Contrato } from "@/hooks/useContratos";
import { toast } from "sonner";

interface Props {
  contrato: Contrato | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  aguardando_contrato: { label: "Aguardando Contrato", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  contrato_enviado: { label: "Contrato Enviado", className: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  contrato_assinado: { label: "Contrato Assinado", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
};

const fmt = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return format(parseLocalDate(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
};

type EditForm = {
  nome_cliente: string;
  cpf_cnpj: string;
  email: string;
  whatsapp: string;
  endereco_cliente: string;
  tipo_servico: string;
  pacote: string;
  data_evento: string;
  horario_inicio: string;
  horario_fim: string;
  local_evento: string;
  valor: string;
  forma_pagamento: string;
  observacoes: string;
};

const toForm = (c: Contrato): EditForm => ({
  nome_cliente: c.nome_cliente || "",
  cpf_cnpj: c.cpf_cnpj || "",
  email: c.email || "",
  whatsapp: c.whatsapp || "",
  endereco_cliente: c.endereco_cliente || "",
  tipo_servico: c.tipo_servico || "",
  pacote: c.pacote || "",
  data_evento: c.data_evento || "",
  horario_inicio: c.horario_inicio || "",
  horario_fim: c.horario_fim || "",
  local_evento: c.local_evento || "",
  valor: c.valor != null ? String(c.valor) : "",
  forma_pagamento: c.forma_pagamento || "",
  observacoes: c.observacoes || "",
});

const ContratoDrawer = ({ contrato, open, onClose }: Props) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateContrato = useUpdateContrato();
  const uploadFile = useUploadContratoFile();

  const handleOpenEdit = () => {
    if (!contrato) return;
    setForm(toForm(contrato));
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const handleSave = async () => {
    if (!contrato || !form) return;
    setSaving(true);
    try {
      await updateContrato.mutateAsync({
        id: contrato.id,
        nome_cliente: form.nome_cliente,
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
        valor: form.valor ? Number(form.valor) : null,
        forma_pagamento: form.forma_pagamento || null,
        observacoes: form.observacoes || null,
      });
      toast.success("Contrato atualizado!");
      setEditing(false);
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSigned = async () => {
    if (!contrato) return;
    await updateContrato.mutateAsync({ id: contrato.id, status: "contrato_assinado" });
    toast.success("Contrato marcado como assinado!");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contrato) return;
    await uploadFile.mutateAsync({ contratoId: contrato.id, file });
    e.target.value = "";
  };

  const setField = (k: keyof EditForm, v: string) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  if (!contrato) return null;

  const badge = STATUS_BADGE[contrato.status] ?? STATUS_BADGE.aguardando_contrato;
  const isPdf = contrato.arquivo_contrato_url?.toLowerCase().includes(".pdf");

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { handleCancelEdit(); onClose(); } }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col overflow-hidden p-0 bg-card border-border"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-foreground truncate">
                {contrato.nome_cliente}
              </SheetTitle>
              <Badge variant="outline" className={`mt-1 text-[10px] ${badge.className}`}>
                {badge.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!editing ? (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleOpenEdit}>
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleCancelEdit} disabled={saving}>
                    <X className="w-3 h-3 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-gradient-primary gap-1" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Client info */}
          <Section title="Dados do Cliente" icon={<User className="w-4 h-4" />}>
            {editing && form ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome" colSpan>
                  <Input value={form.nome_cliente} onChange={(e) => setField("nome_cliente", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="CPF/CNPJ">
                  <Input value={form.cpf_cnpj} onChange={(e) => setField("cpf_cnpj", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Email">
                  <Input value={form.email} onChange={(e) => setField("email", e.target.value)} className="bg-muted border-border h-8 text-sm" type="email" />
                </Field>
                <Field label="WhatsApp">
                  <Input value={form.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Endereço" colSpan>
                  <Input value={form.endereco_cliente} onChange={(e) => setField("endereco_cliente", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <InfoLine icon={<User className="w-3.5 h-3.5" />} label="Nome" value={contrato.nome_cliente} />
                {contrato.cpf_cnpj && <InfoLine icon={<FileText className="w-3.5 h-3.5" />} label="CPF/CNPJ" value={contrato.cpf_cnpj} />}
                {contrato.email && <InfoLine icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={contrato.email} />}
                {contrato.whatsapp && <InfoLine icon={<Phone className="w-3.5 h-3.5" />} label="WhatsApp" value={contrato.whatsapp} />}
                {contrato.endereco_cliente && <InfoLine icon={<MapPin className="w-3.5 h-3.5" />} label="Endereço" value={contrato.endereco_cliente} />}
              </div>
            )}
          </Section>

          {/* Event info */}
          <Section title="Evento" icon={<Calendar className="w-4 h-4" />}>
            {editing && form ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de Serviço">
                  <Input value={form.tipo_servico} onChange={(e) => setField("tipo_servico", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Pacote">
                  <Input value={form.pacote} onChange={(e) => setField("pacote", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Data do Evento">
                  <Input type="date" value={form.data_evento} onChange={(e) => setField("data_evento", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Horário Início">
                  <Input type="time" value={form.horario_inicio} onChange={(e) => setField("horario_inicio", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Horário Fim">
                  <Input type="time" value={form.horario_fim} onChange={(e) => setField("horario_fim", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Local" colSpan>
                  <Input value={form.local_evento} onChange={(e) => setField("local_evento", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                {contrato.tipo_servico && <InfoLine icon={<FileText className="w-3.5 h-3.5" />} label="Serviço" value={`${contrato.tipo_servico}${contrato.pacote ? ` · ${contrato.pacote}` : ""}`} />}
                {contrato.data_evento && (
                  <InfoLine icon={<Calendar className="w-3.5 h-3.5" />} label="Data" value={fmtDate(contrato.data_evento)} />
                )}
                {(contrato.horario_inicio || contrato.horario_fim) && (
                  <InfoLine icon={<Clock className="w-3.5 h-3.5" />} label="Horário" value={`${contrato.horario_inicio || ""}${contrato.horario_fim ? ` – ${contrato.horario_fim}` : ""}`} />
                )}
                {contrato.local_evento && <InfoLine icon={<MapPin className="w-3.5 h-3.5" />} label="Local" value={contrato.local_evento} />}
              </div>
            )}
          </Section>

          {/* Financial info */}
          <Section title="Financeiro" icon={<DollarSign className="w-4 h-4" />}>
            {editing && form ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor (R$)">
                  <Input type="number" step="0.01" value={form.valor} onChange={(e) => setField("valor", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Forma de Pagamento">
                  <Input value={form.forma_pagamento} onChange={(e) => setField("forma_pagamento", e.target.value)} className="bg-muted border-border h-8 text-sm" />
                </Field>
                <Field label="Observações" colSpan>
                  <Textarea value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} className="bg-muted border-border text-sm min-h-[60px]" />
                </Field>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <InfoLine icon={<DollarSign className="w-3.5 h-3.5" />} label="Valor" value={fmt(contrato.valor)} />
                {contrato.forma_pagamento && <InfoLine icon={<FileText className="w-3.5 h-3.5" />} label="Pagamento" value={contrato.forma_pagamento} />}
                {contrato.observacoes && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground italic leading-relaxed">
                    {contrato.observacoes}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* File / contract */}
          <Section title="Arquivo do Contrato" icon={<FileText className="w-4 h-4" />}>
            {contrato.arquivo_contrato_url ? (
              <div className="space-y-3">
                {isPdf ? (
                  <iframe
                    src={contrato.arquivo_contrato_url}
                    className="w-full rounded-lg border border-border"
                    style={{ height: 320 }}
                    title="Contrato"
                  />
                ) : (
                  <img
                    src={contrato.arquivo_contrato_url}
                    alt="Contrato"
                    className="w-full max-h-72 object-contain rounded-lg border border-border cursor-pointer"
                    onClick={() => window.open(contrato.arquivo_contrato_url!, "_blank")}
                  />
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(contrato.arquivo_contrato_url!, "_blank")}>
                    <ExternalLink className="w-3 h-3" /> Abrir em nova aba
                  </Button>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploadFile.isPending}>
                    <Upload className="w-3 h-3" /> {uploadFile.isPending ? "Enviando..." : "Substituir"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-3 rounded-lg border border-dashed border-border">
                <FileText className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Nenhum arquivo anexado</p>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploadFile.isPending}>
                  <Upload className="w-3 h-3" /> {uploadFile.isPending ? "Enviando..." : "Anexar Contrato"}
                </Button>
              </div>
            )}
          </Section>
        </div>

        {/* Footer actions */}
        {!editing && contrato.status === "contrato_enviado" && (
          <div className="px-5 py-3 border-t border-border shrink-0">
            <Button
              className="w-full h-9 text-sm gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              onClick={handleMarkSigned}
              disabled={updateContrato.isPending}
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar como Assinado
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ── Small helpers ────────────────────────────────────────────────────────────

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const Field = ({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) => (
  <div className={colSpan ? "col-span-2" : ""}>
    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">{label}</Label>
    {children}
  </div>
);

const InfoLine = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">{label}</span>
      <span className="text-foreground text-sm leading-snug break-words">{value}</span>
    </div>
  </div>
);

export default ContratoDrawer;
