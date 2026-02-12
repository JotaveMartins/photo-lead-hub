import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, MapPin, Send, Trash2, MessageSquare } from "lucide-react";
import { useLeadNotes, useCreateLeadNote, useDeleteLeadNote } from "@/hooks/useLeadNotes";
import { usePackages } from "@/hooks/usePackages";
import LeadStatusBadgeDB from "./LeadStatusBadgeDB";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadDetailDrawer = ({ lead, open, onOpenChange }: LeadDetailDrawerProps) => {
  const [newNote, setNewNote] = useState("");
  const { data: notes = [] } = useLeadNotes(lead?.id);
  const createNote = useCreateLeadNote();
  const deleteNote = useDeleteLeadNote();
  const { data: packages = [] } = usePackages();

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    await createNote.mutateAsync({ lead_id: lead.id, content: newNote.trim() });
    setNewNote("");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString("pt-BR");
  };

  const linkedPackage = lead?.package_id ? packages.find((p) => p.id === lead.package_id) : null;

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-display flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            {lead.nome}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <LeadStatusBadgeDB status={lead.status} />
        </div>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              Notas
              {notes.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{notes.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="WhatsApp" value={lead.whatsapp} icon={<Phone className="w-4 h-4" />} />
              <InfoItem label="Interesse" value={lead.interesse || "—"} />
              <InfoItem label="Origem" value={(lead as any).origem || "—"} icon={<MapPin className="w-4 h-4" />} />
              <InfoItem label="Valor" value={lead.valor ? `R$ ${lead.valor.toLocaleString("pt-BR")}` : "—"} />
              <InfoItem label="Data do Evento" value={formatDate(lead.data_evento)} icon={<Calendar className="w-4 h-4" />} />
              <InfoItem label="Data do Pedido" value={formatDate(lead.data_pedido)} />
              <InfoItem label="Data Proposta" value={formatDate(lead.data_proposta)} />
              <InfoItem label="Pacote Vinculado" value={linkedPackage?.nome || "—"} />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Follow-ups</h4>
              <div className="grid grid-cols-3 gap-2">
                {[lead.follow_up_1, lead.follow_up_2, lead.follow_up_3].map((fu, i) => (
                  <div key={i} className="text-center p-2 rounded-lg bg-muted border border-border">
                    <p className="text-xs text-muted-foreground">FU {i + 1}</p>
                    <p className={`text-sm ${fu ? "text-foreground" : "text-muted-foreground"}`}>{formatDate(fu)}</p>
                  </div>
                ))}
              </div>
            </div>

            {lead.motivo_perda && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Motivo da perda</p>
                <p className="text-sm text-foreground">{lead.motivo_perda}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(`https://wa.me/55${lead.whatsapp}`, "_blank")}
            >
              <MessageSquare className="w-4 h-4" />
              Abrir WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Adicione uma nota..."
                  className="bg-muted border-border flex-1 min-h-[60px]"
                />
                <Button
                  size="icon"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createNote.isPending}
                  className="bg-gradient-primary hover:opacity-90 self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda. Comece adicionando uma!</p>
                ) : notes.map((note) => (
                  <div key={note.id} className="bg-muted rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteNote.mutate({ id: note.id, lead_id: note.lead_id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{formatDateTime(note.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="bg-muted rounded-lg p-3">
    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">{icon}{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

export default LeadDetailDrawer;
