import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, User, Calendar, MapPin, DollarSign } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export interface ContratoFormData {
  nome_cliente: string;
  cpf_cnpj: string;
  email: string;
  whatsapp: string;
  endereco_cliente: string;
  data_evento: string;
  horario_inicio: string;
  horario_fim: string;
  local_evento: string;
  tipo_servico: string;
  pacote: string;
  valor: string;
  forma_pagamento: string;
  observacoes: string;
}

interface ContratoInfoModalProps {
  open: boolean;
  lead: Lead | null;
  onConfirm: (data: ContratoFormData) => void;
  onCancel: () => void;
}

const FORMAS_PAGAMENTO = [
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência Bancária",
  "Dinheiro",
  "Boleto",
  "Entrada + Parcelas",
];

const ContratoInfoModal = ({ open, lead, onConfirm, onCancel }: ContratoInfoModalProps) => {
  const [form, setForm] = useState<ContratoFormData>({
    nome_cliente: "",
    cpf_cnpj: "",
    email: "",
    whatsapp: "",
    endereco_cliente: "",
    data_evento: "",
    horario_inicio: "",
    horario_fim: "",
    local_evento: "",
    tipo_servico: "",
    pacote: "",
    valor: "",
    forma_pagamento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (lead) {
      setForm((prev) => ({
        ...prev,
        nome_cliente: lead.nome || "",
        whatsapp: lead.whatsapp || "",
        data_evento: lead.data_evento || "",
        tipo_servico: lead.interesse || "",
        valor: lead.valor ? String(lead.valor) : "",
      }));
    }
  }, [lead]);

  const set = (field: keyof ContratoFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleConfirm = () => {
    if (!form.nome_cliente.trim()) return;
    onConfirm(form);
  };

  if (!open || !lead) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Informações do Contrato
          </AlertDialogTitle>
          <AlertDialogDescription>
            Preencha os dados necessários para criar o contrato de{" "}
            <span className="font-semibold text-foreground">{lead.nome}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-5 py-2">
          {/* Client info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" /> Dados do Cliente
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome completo *</Label>
                <Input
                  value={form.nome_cliente}
                  onChange={(e) => set("nome_cliente", e.target.value)}
                  placeholder="Nome do cliente"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF / CNPJ</Label>
                <Input
                  value={form.cpf_cnpj}
                  onChange={(e) => set("cpf_cnpj", e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Endereço do cliente</Label>
                <Input
                  value={form.endereco_cliente}
                  onChange={(e) => set("endereco_cliente", e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Event info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" /> Dados do Evento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data do evento</Label>
                <Input
                  type="date"
                  value={form.data_evento}
                  onChange={(e) => set("data_evento", e.target.value)}
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de serviço</Label>
                <Input
                  value={form.tipo_servico}
                  onChange={(e) => set("tipo_servico", e.target.value)}
                  placeholder="Ex: Casamento, 15 Anos, Ensaio..."
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horário de início</Label>
                <Input
                  type="time"
                  value={form.horario_inicio}
                  onChange={(e) => set("horario_inicio", e.target.value)}
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horário de término</Label>
                <Input
                  type="time"
                  value={form.horario_fim}
                  onChange={(e) => set("horario_fim", e.target.value)}
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Local do evento
                </Label>
                <Input
                  value={form.local_evento}
                  onChange={(e) => set("local_evento", e.target.value)}
                  placeholder="Nome e endereço do local"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Contract details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" /> Valores e Condições
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor total (R$)</Label>
                <Input
                  type="number"
                  value={form.valor}
                  onChange={(e) => set("valor", e.target.value)}
                  placeholder="0,00"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forma de pagamento</Label>
                <select
                  value={form.forma_pagamento}
                  onChange={(e) => set("forma_pagamento", e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Pacote / Serviço contratado</Label>
                <Input
                  value={form.pacote}
                  onChange={(e) => set("pacote", e.target.value)}
                  placeholder="Descrição do pacote ou serviço"
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Observações / Condições especiais</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  placeholder="Cláusulas especiais, entregas adicionais, etc."
                  className="bg-muted border-border text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!form.nome_cliente.trim()}
            className="bg-gradient-primary hover:opacity-90 gap-1"
          >
            <FileText className="w-4 h-4" /> Salvar e Continuar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ContratoInfoModal;
