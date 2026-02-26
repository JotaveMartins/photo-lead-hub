import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import InteresseSelect from "@/components/InteresseSelect";
import DatePickerField from "@/components/DatePickerField";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const whatsappSchema = z.string().regex(/^\d{10,11}$/, "WhatsApp deve ter 10 ou 11 dígitos");
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
}

const LeadModal = ({ open, onOpenChange, lead }: LeadModalProps) => {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interesse, setInteresse] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo Lead");
  const [origem, setOrigem] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [dataContato, setDataContato] = useState("");
  const [dataProposta, setDataProposta] = useState("");
  const [followUp1, setFollowUp1] = useState("");
  const [followUp2, setFollowUp2] = useState("");
  const [valor, setValor] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");

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
      setFollowUp1(toDateOnly(lead.follow_up_1));
      setFollowUp2(toDateOnly(lead.follow_up_2));
      setValor(lead.valor?.toString() || "");
      setMotivoPerda(lead.motivo_perda || "");
    } else {
      resetForm();
    }
  }, [lead, open]);

  const resetForm = () => {
    setNome(""); setWhatsapp(""); setInteresse(""); setStatus("Novo Lead"); setOrigem("");
    setDataEvento(""); setDataContato(""); setDataProposta("");
    setFollowUp1(""); setFollowUp2("");
    setValor(""); setMotivoPerda("");
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
        follow_up_1: followUp1 || null,
        follow_up_2: followUp2 || null,
        valor: valor ? parseFloat(valor) : null,
        motivo_perda: motivoPerda || null,
      };

      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, ...leadData });
      } else {
        await createLead.mutateAsync(leadData);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {lead ? "Editar Lead" : "Novo Lead"}
          </DialogTitle>
        </DialogHeader>

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
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                <SelectContent>
                  {ORIGEM_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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


          {status === "Fechado Perdido" && (
            <div className="space-y-2">
              <Label>Motivo da Perda</Label>
              <Textarea value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} placeholder="Por que o lead foi perdido?" className="bg-muted border-border" />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={isPending}>
              {isPending ? (lead ? "Salvando..." : "Criando...") : (lead ? "Salvar alterações" : "Criar lead")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
