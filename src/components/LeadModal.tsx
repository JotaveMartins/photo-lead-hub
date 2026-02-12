import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePackages, useCreatePackage } from "@/hooks/usePackages";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

const whatsappSchema = z.string().regex(/^\d{10,11}$/, "WhatsApp deve ter 10 ou 11 dígitos");
const nomeSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100);

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "Novo Lead", label: "Novo Lead" },
  { value: "Contato Iniciado", label: "Contato Iniciado" },
  { value: "Proposta Enviada", label: "Proposta Enviada" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Contrato Enviado", label: "Contrato Enviado" },
  { value: "Fechado Ganho", label: "Fechado Ganho" },
  { value: "Fechado Perdido", label: "Fechado Perdido" },
];

const LeadModal = ({ open, onOpenChange, lead }: LeadModalProps) => {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interesse, setInteresse] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo Lead");
  const [origem, setOrigem] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [dataPedido, setDataPedido] = useState("");
  const [dataProposta, setDataProposta] = useState("");
  const [followUp1, setFollowUp1] = useState("");
  const [followUp2, setFollowUp2] = useState("");
  const [followUp3, setFollowUp3] = useState("");
  const [valor, setValor] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const [newPackage, setNewPackage] = useState("");
  const [showNewPackage, setShowNewPackage] = useState(false);

  const { data: packages = [] } = usePackages();
  const createPackage = useCreatePackage();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  useEffect(() => {
    if (lead) {
      setNome(lead.nome);
      setWhatsapp(lead.whatsapp);
      setInteresse(lead.interesse || "");
      setStatus(lead.status);
      setOrigem((lead as any).origem || "");
      setDataEvento(lead.data_evento || "");
      setDataPedido(lead.data_pedido || "");
      setDataProposta(lead.data_proposta || "");
      setFollowUp1(lead.follow_up_1 || "");
      setFollowUp2(lead.follow_up_2 || "");
      setFollowUp3(lead.follow_up_3 || "");
      setValor(lead.valor?.toString() || "");
      setMotivoPerda(lead.motivo_perda || "");
    } else {
      resetForm();
    }
  }, [lead, open]);

  const resetForm = () => {
    setNome(""); setWhatsapp(""); setInteresse(""); setStatus("Novo Lead"); setOrigem("");
    setDataEvento(""); setDataPedido(""); setDataProposta("");
    setFollowUp1(""); setFollowUp2(""); setFollowUp3("");
    setValor(""); setMotivoPerda(""); setNewPackage(""); setShowNewPackage(false);
  };

  const handleAddPackage = async () => {
    if (newPackage.trim()) {
      await createPackage.mutateAsync(newPackage.trim());
      setInteresse(newPackage.trim());
      setNewPackage("");
      setShowNewPackage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nomeSchema.parse(nome);
      whatsappSchema.parse(whatsapp.replace(/\D/g, ""));

      const leadData = {
        nome,
        whatsapp: whatsapp.replace(/\D/g, ""),
        interesse: interesse || null,
        status,
        origem: origem || null,
        data_evento: dataEvento || null,
        data_pedido: dataPedido || null,
        data_proposta: dataProposta || null,
        follow_up_1: followUp1 || null,
        follow_up_2: followUp2 || null,
        follow_up_3: followUp3 || null,
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
            <div className="space-y-2">
              <Label>Interesse (Pacote)</Label>
              {showNewPackage ? (
                <div className="flex gap-2">
                  <Input value={newPackage} onChange={(e) => setNewPackage(e.target.value)} placeholder="Nome do novo pacote" className="bg-muted border-border" />
                  <Button type="button" size="icon" onClick={handleAddPackage}><Plus className="w-4 h-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setShowNewPackage(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={interesse} onValueChange={setInteresse}>
                    <SelectTrigger className="bg-muted border-border flex-1"><SelectValue placeholder="Selecione um pacote" /></SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.nome}>{pkg.nome} {pkg.is_default && "(padrão)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" onClick={() => setShowNewPackage(true)}><Plus className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex: Instagram, Indicação, Google..." className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="bg-muted border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data do Evento</Label>
              <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label>Data do Pedido</Label>
              <Input type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label>Data da Proposta</Label>
              <Input type="date" value={dataProposta} onChange={(e) => setDataProposta(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Follow-up 1</Label><Input type="date" value={followUp1} onChange={(e) => setFollowUp1(e.target.value)} className="bg-muted border-border" /></div>
            <div className="space-y-2"><Label>Follow-up 2</Label><Input type="date" value={followUp2} onChange={(e) => setFollowUp2(e.target.value)} className="bg-muted border-border" /></div>
            <div className="space-y-2"><Label>Follow-up 3</Label><Input type="date" value={followUp3} onChange={(e) => setFollowUp3(e.target.value)} className="bg-muted border-border" /></div>
          </div>

          {status === "Fechado Perdido" && (
            <div className="space-y-2">
              <Label>Motivo da Perda</Label>
              <Textarea value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} placeholder="Por que o lead foi perdido?" className="bg-muted border-border" />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">{lead ? "Salvar alterações" : "Criar lead"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
