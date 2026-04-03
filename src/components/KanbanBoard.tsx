import { useState, useMemo } from "react";
import { useInteresseOptions } from "@/hooks/useInteresseOptions";
import { useLeads, useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useAllPendingTasks, type LeadTask } from "@/hooks/useLeadTasks";
import { useCreateFollowUpTask } from "@/hooks/useLeadTasks";
import { Phone, Calendar, GripVertical, Search, Filter, DollarSign, ChevronRight, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import RequiredFieldsModal from "@/components/RequiredFieldsModal";
import LeadToClienteFlow from "@/components/LeadToClienteFlow";
import FollowUpModal from "@/components/FollowUpModal";
import LossReasonModal from "@/components/LossReasonModal";
import type { Database } from "@/integrations/supabase/types";
import { isBefore, isToday, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

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
  "Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

interface KanbanBoardProps {
  onLeadClick: (lead: Lead) => void;
}

type TaskStatus = "none" | "future" | "today" | "overdue";

const getLeadTaskStatus = (leadId: string, tasks: LeadTask[]): TaskStatus => {
  const leadTasks = tasks.filter(t => t.lead_id === leadId);
  if (leadTasks.length === 0) return "none";
  
  const today = startOfDay(new Date());
  const hasOverdue = leadTasks.some(t => isBefore(parseLocalDate(t.due_date), today));
  if (hasOverdue) return "overdue";
  const hasToday = leadTasks.some(t => isToday(parseLocalDate(t.due_date)));
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
  const { data: interesseOptions = [] } = useInteresseOptions();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createFollowUp = useCreateFollowUpTask();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | "DELETE" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [interesseFilter, setInteresseFilter] = useState<string>("all");
  const [requiredFieldsLead, setRequiredFieldsLead] = useState<Lead | null>(null);
  const [requiredFieldsTarget, setRequiredFieldsTarget] = useState<LeadStatus | null>(null);
  // Follow-up modal state
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  // Delete confirmation state
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);
  // Loss reason modal state
  const [lossReasonLead, setLossReasonLead] = useState<Lead | null>(null);
  const [lossReasonOpen, setLossReasonOpen] = useState(false);
  // Lead to cliente flow state
  const [leadToClienteLead, setLeadToClienteLead] = useState<Lead | null>(null);

  const REQUIRED_FIELDS_STATUSES: LeadStatus[] = ["Proposta Enviada", "Contrato Enviado", "Fechado Ganho"];

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !searchQuery || 
        lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.whatsapp.includes(searchQuery);
      const matchesOrigem = origemFilter === "all" || lead.origem === origemFilter;
      const matchesInteresse = interesseFilter === "all" || lead.interesse === interesseFilter;
      return matchesSearch && matchesOrigem && matchesInteresse;
    });
  }, [leads, searchQuery, origemFilter, interesseFilter]);

  const getColumnValue = (status: LeadStatus) => {
    return filteredLeads
      .filter((l) => l.status === status)
      .reduce((sum, l) => sum + (l.valor || 0), 0);
  };

  const isUpdating = updateLead.isPending;

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    if (isUpdating) return;
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

  const moveLeadToStatus = (lead: Lead, newStatus: LeadStatus, extraFields?: Record<string, any>) => {
    if (newStatus === "Proposta Enviada") {
      updateLead.mutate({ id: lead.id, status: "Follow-up" as LeadStatus, ...extraFields }, {
        onSuccess: () => {
          setFollowUpLead(lead);
          setFollowUpModalOpen(true);
        }
      });
    } else if (newStatus === "Fechado Ganho") {
      updateLead.mutate({ id: lead.id, status: newStatus, ...extraFields }, {
        onSuccess: () => {
          setLeadToClienteLead(lead);
        }
      });
    } else {
      updateLead.mutate({ id: lead.id, status: newStatus, ...extraFields });
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedLeadId) {
      const lead = leads.find((l) => l.id === draggedLeadId);
      if (lead && lead.status !== newStatus) {
        if (newStatus === "Fechado Perdido") {
          setLossReasonLead(lead);
          setLossReasonOpen(true);
        } else {
          const needsRequiredFields = REQUIRED_FIELDS_STATUSES.includes(newStatus) && (
            (!lead.valor || lead.valor <= 0) ||
            ((newStatus === "Proposta Enviada") && (!lead.data_proposta || !lead.data_evento || !lead.interesse || !lead.origem))
          );
          if (needsRequiredFields) {
            setRequiredFieldsLead(lead);
            setRequiredFieldsTarget(newStatus);
          } else {
            moveLeadToStatus(lead, newStatus);
          }
        }
      }
    }
    setDraggedLeadId(null);
    setIsDragging(false);
  };

  const handleLossReasonConfirm = (data: { motivo_perda: string; observacao_perda: string | null }) => {
    if (lossReasonLead) {
      updateLead.mutate({
        id: lossReasonLead.id,
        status: "Fechado Perdido" as LeadStatus,
        motivo_perda: data.motivo_perda,
        observacao_perda: data.observacao_perda,
      });
      setLossReasonLead(null);
      setLossReasonOpen(false);
    }
  };

  const handleRequiredFieldsConfirm = (fields: { valor: number; data_proposta?: string; data_evento?: string; interesse?: string; origem?: string }) => {
    if (requiredFieldsLead && requiredFieldsTarget) {
      moveLeadToStatus(requiredFieldsLead, requiredFieldsTarget, fields);
      setRequiredFieldsLead(null);
      setRequiredFieldsTarget(null);
    }
  };

  const handleFollowUpConfirm = (date: string) => {
    if (followUpLead) {
      createFollowUp.mutate({ leadId: followUpLead.id, followUpNumber: 1, dueDate: date });
      setFollowUpLead(null);
    }
  };

  const handleFollowUpDecline = () => {
    setFollowUpLead(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return parseLocalDate(d).toLocaleDateString("pt-BR");
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
        <div className="relative w-[180px]">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            aria-label="Filtrar por origem"
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-muted pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">Todas origens</option>
            {ORIGEM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-[180px]">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            aria-label="Filtrar por interesse"
            value={interesseFilter}
            onChange={(e) => setInteresseFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-muted pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">Todos interesses</option>
            {interesseOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
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

      {/* Drop zones for Ganho/Perdido/Excluir - FIXED at bottom of screen */}
      {isDragging && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background/95 to-transparent animate-fade-in">
          <div className="flex gap-3 max-w-5xl mx-auto">
            {CLOSED_COLUMNS.map((col) => {
              const isDragOverCol = dragOverColumn === col.status;
              return (
                <div
                  key={col.status}
                  className={`flex-1 border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 transition-all ${
                    isDragOverCol
                      ? col.status === "Fechado Ganho"
                        ? "border-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/10 text-[hsl(var(--status-success))]"
                        : "border-[hsl(var(--status-danger))] bg-[hsl(var(--status-danger))]/10 text-[hsl(var(--status-danger))]"
                      : "border-border text-muted-foreground bg-card/80 backdrop-blur-sm"
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
            {/* Delete drop zone */}
            <div
              className={`flex-1 border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 transition-all ${
                dragOverColumn === "DELETE"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground bg-card/80 backdrop-blur-sm"
              }`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn("DELETE"); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                if (draggedLeadId) {
                  const lead = leads.find((l) => l.id === draggedLeadId);
                  if (lead) setDeleteConfirmLead(lead);
                }
                setDraggedLeadId(null);
                setIsDragging(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-semibold text-sm">Excluir</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmLead} onOpenChange={(open) => { if (!open) setDeleteConfirmLead(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirmLead?.nome}</strong>? Esta ação não pode ser desfeita. Todas as tarefas, notas e histórico serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmLead) {
                  deleteLead.mutate(deleteConfirmLead.id);
                  setDeleteConfirmLead(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Required Fields Modal */}
      <RequiredFieldsModal
        open={!!requiredFieldsLead}
        onOpenChange={(open) => { if (!open) { setRequiredFieldsLead(null); setRequiredFieldsTarget(null); } }}
        leadName={requiredFieldsLead?.nome || ""}
        targetStatus={requiredFieldsTarget || ""}
        currentValor={requiredFieldsLead?.valor ?? null}
        currentDataProposta={requiredFieldsLead?.data_proposta ?? null}
        currentDataEvento={requiredFieldsLead?.data_evento ?? null}
        currentInteresse={requiredFieldsLead?.interesse ?? null}
        currentOrigem={requiredFieldsLead?.origem ?? null}
        onConfirm={handleRequiredFieldsConfirm}
        isPending={isUpdating}
      />

      {/* Follow-up Modal */}
      <FollowUpModal
        open={followUpModalOpen}
        onOpenChange={setFollowUpModalOpen}
        mode="activate"
        nextNumber={1}
        leadName={followUpLead?.nome || ""}
        onConfirm={handleFollowUpConfirm}
        onDecline={handleFollowUpDecline}
      />

      {/* Loss Reason Modal */}
      <LossReasonModal
        open={lossReasonOpen}
        onOpenChange={(v) => { setLossReasonOpen(v); if (!v) setLossReasonLead(null); }}
        leadName={lossReasonLead?.nome || ""}
        onConfirm={handleLossReasonConfirm}
      />
    </div>
  );
};

export default KanbanBoard;
