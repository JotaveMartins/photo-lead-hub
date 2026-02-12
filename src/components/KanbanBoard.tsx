import { useState, useMemo } from "react";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { useAllPendingTasks, type LeadTask } from "@/hooks/useLeadTasks";
import { Phone, Calendar, GripVertical, Search, Filter, DollarSign, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import { isBefore, isToday, parseISO, startOfDay } from "date-fns";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const ACTIVE_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "Novo Lead", label: "Novo Lead", color: "bg-[hsl(var(--status-info))]" },
  { status: "Contato Iniciado", label: "Contato Iniciado", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Proposta Enviada", label: "Proposta Enviada", color: "bg-primary" },
  { status: "Follow-up", label: "Follow-up", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Contrato Enviado", label: "Contrato Enviado", color: "bg-accent" },
];

const CLOSED_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "Fechado Ganho", label: "Ganho", color: "bg-[hsl(var(--status-success))]" },
  { status: "Fechado Perdido", label: "Perdido", color: "bg-[hsl(var(--status-danger))]" },
];

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

interface KanbanBoardProps {
  onLeadClick: (lead: Lead) => void;
}

type TaskStatus = "none" | "future" | "today" | "overdue";

const getLeadTaskStatus = (leadId: string, tasks: LeadTask[]): TaskStatus => {
  const leadTasks = tasks.filter(t => t.lead_id === leadId);
  if (leadTasks.length === 0) return "none";
  
  const today = startOfDay(new Date());
  const hasOverdue = leadTasks.some(t => isBefore(parseISO(t.due_date), today));
  if (hasOverdue) return "overdue";
  const hasToday = leadTasks.some(t => isToday(parseISO(t.due_date)));
  if (hasToday) return "today";
  return "future";
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { color: string; bg: string; label: string }> = {
  none: { color: "text-yellow-500", bg: "bg-yellow-500", label: "Sem tarefas" },
  future: { color: "text-muted-foreground", bg: "bg-muted-foreground", label: "Tarefa futura" },
  today: { color: "text-green-500", bg: "bg-green-500", label: "Tarefa para hoje" },
  overdue: { color: "text-red-500", bg: "bg-red-500", label: "Tarefa atrasada" },
};

const KanbanBoard = ({ onLeadClick }: KanbanBoardProps) => {
  const { data: leads = [], isLoading } = useLeads();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const updateLead = useUpdateLead();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [origemFilter, setOrigemFilter] = useState<string>("all");

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !searchQuery || 
        lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.whatsapp.includes(searchQuery);
      const matchesOrigem = origemFilter === "all" || lead.origem === origemFilter;
      return matchesSearch && matchesOrigem;
    });
  }, [leads, searchQuery, origemFilter]);

  const getColumnValue = (status: LeadStatus) => {
    return filteredLeads
      .filter((l) => l.status === status)
      .reduce((sum, l) => sum + (l.valor || 0), 0);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
    setIsDragging(false);
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
    setIsDragging(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted border-border h-9"
          />
        </div>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="w-[180px] bg-muted border-border h-9">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {ORIGEM_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {ACTIVE_COLUMNS.map((col) => {
          const columnLeads = filteredLeads.filter((l) => l.status === col.status);
          const isDragOver = dragOverColumn === col.status;
          const totalValue = getColumnValue(col.status);

          return (
            <div
              key={col.status}
              className={`flex-shrink-0 w-72 bg-card border rounded-xl flex flex-col transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column header */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(totalValue)}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                {columnLeads.map((lead) => {
                  const taskStatus = getLeadTaskStatus(lead.id, pendingTasks);
                  const taskConfig = TASK_STATUS_CONFIG[taskStatus];

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onLeadClick(lead)}
                      className={`bg-muted border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all group ${
                        draggedLeadId === lead.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${taskConfig.color}`} style={{ borderColor: 'currentColor' }}>
                                <ChevronRight className="w-3 h-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{taskConfig.label}</p>
                            </TooltipContent>
                          </Tooltip>
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.whatsapp}
                        </p>
                        {lead.valor && lead.valor > 0 && (
                          <p className="text-xs font-medium text-foreground">
                            {formatCurrency(lead.valor)}
                          </p>
                        )}
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
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop zones for Ganho/Perdido */}
      {isDragging && (
        <div className="flex gap-3 animate-fade-in">
          {CLOSED_COLUMNS.map((col) => {
            const isDragOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                className={`flex-1 border-2 border-dashed rounded-xl p-6 flex items-center justify-center gap-2 transition-all ${
                  isDragOver
                    ? col.status === "Fechado Ganho"
                      ? "border-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/10 text-[hsl(var(--status-success))]"
                      : "border-[hsl(var(--status-danger))] bg-[hsl(var(--status-danger))]/10 text-[hsl(var(--status-danger))]"
                    : "border-border text-muted-foreground"
                }`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className={`w-3 h-3 rounded-full ${col.color}`} />
                <span className="font-semibold text-sm">{col.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
