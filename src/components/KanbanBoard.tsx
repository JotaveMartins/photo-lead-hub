import { useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { Phone, Calendar, GripVertical } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const KANBAN_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "Novo Lead", label: "Novo Lead", color: "bg-[hsl(var(--status-info))]" },
  { status: "Contato Iniciado", label: "Contato Iniciado", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Proposta Enviada", label: "Proposta Enviada", color: "bg-primary" },
  { status: "Follow-up", label: "Follow-up", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Contrato Enviado", label: "Contrato Enviado", color: "bg-accent" },
  { status: "Fechado Ganho", label: "Fechado Ganho", color: "bg-[hsl(var(--status-success))]" },
  { status: "Fechado Perdido", label: "Fechado Perdido", color: "bg-[hsl(var(--status-danger))]" },
];

interface KanbanBoardProps {
  onLeadClick: (lead: Lead) => void;
}

const KanbanBoard = ({ onLeadClick }: KanbanBoardProps) => {
  const { data: leads = [], isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedLeadId) {
      const lead = leads.find((l) => l.id === draggedLeadId);
      if (lead && lead.status !== newStatus) {
        updateLead.mutate({ id: draggedLeadId, status: newStatus });
      }
    }
    setDraggedLeadId(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Carregando...</div>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
      {KANBAN_COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        const isDragOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-64 bg-card border rounded-xl flex flex-col transition-colors ${
              isDragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="p-3 border-b border-border flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {columnLeads.length}
              </span>
            </div>

            <div className="p-2 flex-1 space-y-2 overflow-y-auto">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onClick={() => onLeadClick(lead)}
                  className={`bg-muted border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all group ${
                    draggedLeadId === lead.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                    <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lead.whatsapp}
                    </p>
                    {lead.interesse && (
                      <p className="text-xs text-primary truncate">{lead.interesse}</p>
                    )}
                    {lead.data_evento && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(lead.data_evento)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
