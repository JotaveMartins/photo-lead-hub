import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InteresseSelect from "@/components/InteresseSelect";
import DatePickerField from "@/components/DatePickerField";
import SearchSelect from "@/components/SearchSelect";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const whatsappSchema = z.string().min(7, "WhatsApp deve ter pelo menos 7 dígitos").max(15, "WhatsApp deve ter no máximo 15 dígitos").regex(/^\d+$/, "WhatsApp deve conter apenas números");
const nomeSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100);

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "Novo Lead", label: "Novo Lead" },
  { value: "Contato Iniciado", label: "Contato Iniciado" },
  { value: "Proposta Enviada", label: "Proposta Enviada" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Contrato Enviado", label: "Contrato Enviado" },
  { value: "Fechado Ganho", label: "Fechado Ganho" },
  { value: "Fechado Perdido", label: "Fechado Perdido" },
];

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  prefillNome?: string;
  prefillWhatsapp?: string;
  onCreated?: (lead: Lead) => void;
}

const LeadModal = ({ open, onOpenChange, lead, prefillNome, prefillWhatsapp, onCreated }: LeadModalProps) => {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interesse, setInteresse] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo Lead");
  const [origem, setOrigem] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [dataContato, setDataContato] = useState("");
  const [dataProposta, setDataProposta] = useState("");
  const [valor, setValor] = useState("");

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  // Extract YYYY-MM-DD from any date/timestamp string to avoid timezone shifts
  const toDateOnly = (v: string | null | undefined): string => 
    v ? v.substring(0, 10) : "";

  useEffect(() => {
    if (lead) {
      setNome(lead.nome);
      setWhatsapp(lead.whatsapp);
      setInteresse(lead.interesse || "");
      setStatus(lead.status);
      setOrigem(lead.origem || "");
      setDataEvento(toDateOnly(lead.data_evento));
      setDataContato(toDateOnly((lead as any).data_contato));
      setDataProposta(toDateOnly(lead.data_proposta));
      setValor(lead.valor?.toString() || "");
    } else {
      resetForm();
      if (prefillNome) setNome(prefillNome);
      if (prefillWhatsapp) setWhatsapp(prefillWhatsapp.replace(/\D/g, ""));
    }
  }, [lead, open, prefillNome, prefillWhatsapp]);

  const resetForm = () => {
    setNome(""); setWhatsapp(""); setInteresse(""); setStatus("Novo Lead"); setOrigem("");
    // Default Data do Contato to today (local YYYY-MM-DD) for new leads
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setDataEvento(""); setDataContato(todayStr); setDataProposta("");
    setValor("");
  };

    const isPending = createLead.isPending || updateLead.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending) return;
    try {
      nomeSchema.parse(nome);
      whatsappSchema.parse(whatsapp.replace(/\D/g, ""));

      // Validate required fields for new leads
      if (!lead) {
        if (!origem) {
          toast.error("Origem é obrigatória");
          return;
        }
        if (!dataContato) {
          toast.error("Data do Contato é obrigatória");
          return;
        }
      }

      const leadData: any = {
        nome,
        whatsapp: whatsapp.replace(/\D/g, ""),
        interesse: interesse || null,
        status,
        origem: origem || null,
        data_evento: dataEvento || null,
        data_contato: dataContato || null,
        data_proposta: dataProposta || null,
        valor: valor ? parseFloat(valor) : null,
      };

      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, ...leadData });
      } else {
        const created = await createLead.mutateAsync(leadData);
        if (created && onCreated) onCreated(created as Lead);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao salvar lead. Tente novamente.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {lead ? "Editar Lead" : "Novo Lead"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto pr-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do lead" className="bg-muted border-border" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="31999999999" className="bg-muted border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lead && (
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
            <div className="space-y-2">
              <Label>Interesse</Label>
              <InteresseSelect value={interesse} onValueChange={setInteresse} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem {!lead && <span className="text-destructive">*</span>}</Label>
              <SearchSelect
                value={origem}
                onChange={setOrigem}
                options={ORIGEM_OPTIONS.map((o) => ({ value: o, label: o }))}
                placeholder="Selecione a origem"
                emptyLabel="Selecione a origem"
                allowEmpty
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="bg-muted border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data do Evento</Label>
              <DatePickerField value={dataEvento} onChange={setDataEvento} placeholder="Selecione" />
            </div>
            <div className="space-y-2">
              <Label>Data do Contato {!lead && <span className="text-destructive">*</span>}</Label>
              <DatePickerField value={dataContato} onChange={setDataContato} placeholder="Selecione" />
            </div>
            <div className="space-y-2">
              <Label>Data da Proposta</Label>
              <DatePickerField value={dataProposta} onChange={setDataProposta} placeholder="Selecione" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={isPending}>
              {isPending ? (lead ? "Salvando..." : "Criando...") : (lead ? "Salvar alterações" : "Criar lead")}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
