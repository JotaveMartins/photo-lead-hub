import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { useInteresseOptions } from "@/hooks/useInteresseOptions";
import SearchSelect from "@/components/SearchSelect";
import { useLeads, useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useAllPendingTasks, type LeadTask } from "@/hooks/useLeadTasks";
import { useCreateFollowUpTask } from "@/hooks/useLeadTasks";
import { useAiActive } from "@/hooks/useAiActive";
import { useLeadUnreadCounts } from "@/hooks/useInbox";
 import { Phone, Calendar, GripVertical, Filter, DollarSign, ChevronRight, Trash2, Bot } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import RequiredFieldsModal from "@/components/RequiredFieldsModal";
import LeadToClienteFlow from "@/components/LeadToClienteFlow";
import FollowUpModal from "@/components/FollowUpModal";
import LossReasonModal from "@/components/LossReasonModal";
import { useCreateContrato } from "@/hooks/useContratos";
import type { Database } from "@/integrations/supabase/types";
import { isBefore, isToday, startOfDay } from "date-fns";
import { parseLocalDate, normalizeText } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import LeadColorTagPicker from "@/components/LeadColorTagPicker";
import { useLeadAdminTags, tagColorClass } from "@/hooks/useLeadAdminTags";

import { usePipelineStages } from "@/hooks/usePipelineStages";
import { pipelineStageColorClass, isTerminalStage, type PipelineStage } from "@/lib/pipelineStages";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

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
  const { stages, openStages, wonStage, lostStage, stageById } = usePipelineStages();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const { data: interesseOptions = [] } = useInteresseOptions();
  const { data: aiActive = false } = useAiActive();
  const { data: unreadByLead = {} } = useLeadUnreadCounts();
  const { isAdmin: canTagLeads, tags: leadTags } = useLeadAdminTags();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createFollowUp = useCreateFollowUpTask();
  const queryClient = useQueryClient();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | "DELETE" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [interesseFilter, setInteresseFilter] = useState<string>("all");
  const [tarefaFilter, setTarefaFilter] = useState<"all" | "overdue" | "none">("all");

  const [statusFilter, setStatusFilter] = useState<"open" | "won" | "lost">("open");
  const [requiredFieldsLead, setRequiredFieldsLead] = useState<Lead | null>(null);
  const [requiredFieldsTarget, setRequiredFieldsTarget] = useState<PipelineStage | null>(null);
  // Follow-up modal state
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  // Delete confirmation state
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);
  const [deleteAlsoTasks, setDeleteAlsoTasks] = useState(true);
  // Loss reason modal state
  const [lossReasonLead, setLossReasonLead] = useState<Lead | null>(null);
  const [lossReasonOpen, setLossReasonOpen] = useState(false);
  // Lead to cliente flow state
  const [leadToClienteLead, setLeadToClienteLead] = useState<Lead | null>(null);
  const [leadToClienteExtraFields, setLeadToClienteExtraFields] = useState<Record<string, any>>({});
  const [ganhoPrevStageId, setGanhoPrevStageId] = useState<string | null>(null);
  const [ganhoTargetStageId, setGanhoTargetStageId] = useState<string | null>(null);
  const [ganhoContratoId, setGanhoContratoId] = useState<string | null>(null);
  const createContrato = useCreateContrato();

  // Etapa de follow-up resolvida pela ponte legada (nunca pelo nome)
  const followUpStage = stages.find((s) => s.legacy_status === "Follow-up");

  // Refs for synchronized horizontal scrollbars (real board + floating proxy)
  const boardRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [showProxy, setShowProxy] = useState(false);

  // Keep the proxy scrollbar width in sync with the board content
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sw = board.scrollWidth;
        const cw = board.clientWidth;
        setScrollWidth((prev) => (prev !== sw ? sw : prev));
        setShowProxy((prev) => {
          const next = sw > cw;
          return prev !== next ? next : prev;
        });
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(board);
    Array.from(board.children).forEach((c) => ro.observe(c as Element));
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [leads.length]);

  // Sync scroll positions between board and proxy bar
  useEffect(() => {
    const board = boardRef.current;
    const proxy = proxyRef.current;
    if (!board || !proxy) return;
    let syncing = false;
    const onBoard = () => {
      if (syncing) return;
      syncing = true;
      proxy.scrollLeft = board.scrollLeft;
      requestAnimationFrame(() => { syncing = false; });
    };
    const onProxy = () => {
      if (syncing) return;
      syncing = true;
      board.scrollLeft = proxy.scrollLeft;
      requestAnimationFrame(() => { syncing = false; });
    };
    board.addEventListener("scroll", onBoard);
    proxy.addEventListener("scroll", onProxy);
    return () => {
      board.removeEventListener("scroll", onBoard);
      proxy.removeEventListener("scroll", onProxy);
    };
  }, [showProxy]);

  // Realtime: refresh unread counts when inbox_conversations changes
  useEffect(() => {
    const channel = supabase
      .channel("kanban-inbox-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbox_conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lead_unread_counts"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredLeads = useMemo(() => {
    const q = normalizeText(searchQuery);
    return leads.filter((lead) => {
      const matchesSearch = !q ||
        normalizeText(lead.nome).includes(q) ||
        normalizeText(lead.whatsapp).includes(q);
      const matchesOrigem = origemFilter === "all" || lead.origem === origemFilter;
      const matchesInteresse = interesseFilter === "all" || lead.interesse === interesseFilter;
      let matchesTarefa = true;
      if (tarefaFilter !== "all") {
        const st = getLeadTaskStatus(lead.id, pendingTasks);
        matchesTarefa = tarefaFilter === "overdue" ? st === "overdue" : st === "none";
      }
      return matchesSearch && matchesOrigem && matchesInteresse && matchesTarefa;
    });
  }, [leads, searchQuery, origemFilter, interesseFilter, tarefaFilter, pendingTasks]);


  const getColumnValue = (stageId: string) => {
    return filteredLeads
      .filter((l) => l.stage_id === stageId)
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

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stageId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const moveLeadToStage = (lead: Lead, stage: PipelineStage, extraFields?: Record<string, any>) => {
    if (stage.stage_role === "proposal") {
      // Ponte legada: proposta padrão -> Follow-up, somente quando ambas as etapas
      // legadas existem na conta. Etapa proposal personalizada: lead permanece nela.
      if (stage.legacy_status === "Proposta Enviada" && followUpStage) {
        // Registra a entrada na proposta ANTES de seguir para Follow-up,
        // para que o histórico tenha: etapa anterior -> proposal -> Follow-up.
        updateLead.mutate({ id: lead.id, stage_id: stage.id, ...extraFields } as any, {
          onSuccess: () => {
            updateLead.mutate({ id: lead.id, stage_id: followUpStage.id } as any, {
              onSuccess: () => {
                setFollowUpLead(lead);
                setFollowUpModalOpen(true);
              }
            });
          }
        });
      } else {
        updateLead.mutate({ id: lead.id, stage_id: stage.id, ...extraFields } as any);
      }
    } else if (stage.stage_role === "won") {
      // A entrada definitiva em won acontece SOMENTE quando o LeadToClienteFlow
      // é concluído (onConfirm). Cancelar antes não gera evento histórico de won.
      setGanhoContratoId(null);
      setGanhoPrevStageId(lead.stage_id);
      setGanhoTargetStageId(stage.id);
      setLeadToClienteExtraFields(extraFields || {});
      setLeadToClienteLead(lead);
    } else {
      updateLead.mutate({ id: lead.id, stage_id: stage.id, ...extraFields } as any);
    }
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const stage = stageById(stageId);
    if (draggedLeadId && stage) {
      const lead = leads.find((l) => l.id === draggedLeadId);
      if (lead && lead.stage_id !== stageId) {
        if (stage.stage_role === "lost") {
          setLossReasonLead(lead);
          setLossReasonOpen(true);
        } else {
          const needsValor = stage.stage_role === "proposal" || stage.stage_role === "won" || stage.legacy_status === "Contrato Enviado";
          const needsRequiredFields = (needsValor && (!lead.valor || lead.valor <= 0)) ||
            (stage.stage_role === "proposal" && (!lead.data_proposta || !lead.interesse || !lead.origem));
          if (needsRequiredFields) {
            setRequiredFieldsLead(lead);
            setRequiredFieldsTarget(stage);
          } else {
            moveLeadToStage(lead, stage);
          }
        }
      }
    }
    setDraggedLeadId(null);
    setIsDragging(false);
  };

  const handleLossReasonConfirm = (data: { motivo_perda: string; observacao_perda: string | null; deleteFutureTasks: boolean }) => {
    if (lossReasonLead && lostStage) {
      const leadId = lossReasonLead.id;
      const shouldDelete = data.deleteFutureTasks;
      updateLead.mutate({
        id: leadId,
        stage_id: lostStage.id,
        motivo_perda: data.motivo_perda,
        observacao_perda: data.observacao_perda,
      } as any, {
        onSuccess: async () => {
          if (shouldDelete) {
            await supabase
              .from("lead_tasks")
              .delete()
              .eq("lead_id", leadId)
              .eq("completed", false);
            queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
          }
        },
      });
      setLossReasonLead(null);
      setLossReasonOpen(false);
    }
  };

  const handleRequiredFieldsConfirm = (fields: { valor: number; data_proposta?: string; data_evento?: string; interesse?: string; origem?: string }) => {
    if (requiredFieldsLead && requiredFieldsTarget) {
      moveLeadToStage(requiredFieldsLead, requiredFieldsTarget, fields);
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
        <SearchInput
          containerClassName="flex-1 max-w-sm"
          placeholder="Buscar leads..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="bg-muted border-border h-9"
        />
        <div className="w-[180px]">
          <SearchSelect
            value={origemFilter === "all" ? "" : origemFilter}
            onChange={(v) => setOrigemFilter(v || "all")}
            options={ORIGEM_OPTIONS.map((o) => ({ value: o, label: o }))}
            placeholder="Todas origens"
            emptyLabel="Todas origens"
            allowEmpty
          />
        </div>
        <div className="w-[180px]">
          <SearchSelect
            value={interesseFilter === "all" ? "" : interesseFilter}
            onChange={(v) => setInteresseFilter(v || "all")}
            options={interesseOptions.map((o) => ({ value: o, label: o }))}
            placeholder="Todos interesses"
            emptyLabel="Todos interesses"
            allowEmpty
          />
        </div>
        <div className="w-[190px]">
          <SearchSelect
            value={tarefaFilter === "all" ? "" : tarefaFilter}
            onChange={(v) => setTarefaFilter((v || "all") as "all" | "overdue" | "none")}
            options={[
              { value: "overdue", label: "Com tarefas atrasadas" },
              { value: "none", label: "Sem tarefas" },
            ]}
            placeholder="Todas as tarefas"
            emptyLabel="Todas as tarefas"
            allowEmpty
          />
        </div>


        {/* Status filter — pinned to the right */}
        <div className="sm:ml-auto flex bg-muted rounded-lg p-1 h-9">
          {([
            { key: "open", label: "Em aberto" },
            { key: "won", label: "Ganhos" },
            { key: "lost", label: "Perdidos" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={`px-3 rounded-md text-xs font-medium transition-colors ${
                statusFilter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div
        ref={boardRef}
        className="flex gap-3 overflow-x-auto overflow-y-visible pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {(statusFilter === "open"
          ? openStages.filter((s) => s.legacy_status !== "Triagem Feita" || aiActive)
          : statusFilter === "won"
          ? (wonStage ? [wonStage] : [])
          : (lostStage ? [lostStage] : [])
        ).map((col) => {
          const columnLeadsUnsorted = filteredLeads.filter((l) => l.stage_id === col.id);
          const getNextTaskTime = (leadId: string): number => {
            const ts = pendingTasks
              .filter((t) => t.lead_id === leadId)
              .map((t) => parseLocalDate(t.due_date).getTime());
            if (ts.length === 0) return Number.POSITIVE_INFINITY;
            return Math.min(...ts);
          };
          const columnLeads = [...columnLeadsUnsorted].sort(
            (a, b) => getNextTaskTime(a.id) - getNextTaskTime(b.id)
          );
          const isDragOver = dragOverColumn === col.id;
          const totalValue = getColumnValue(col.id);

          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-72 xl:flex-1 xl:w-auto xl:min-w-0 bg-card border rounded-xl flex flex-col transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${pipelineStageColorClass(col.color_key)}`} />
                  <span className="text-sm font-semibold text-foreground">{col.name}</span>
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
              <div className="p-2 flex-1 space-y-2">
                {columnLeads.map((lead) => {
                  const taskStatus = getLeadTaskStatus(lead.id, pendingTasks);
                  const taskConfig = TASK_STATUS_CONFIG[taskStatus];

                    const isTriagem = stageById(lead.stage_id)?.legacy_status === "Triagem Feita";
                   return (
                     <div
                       key={lead.id}
                       draggable
                       onDragStart={(e) => handleDragStart(e, lead.id)}
                       onDragEnd={handleDragEnd}
                       onClick={() => onLeadClick(lead)}
                       className={`bg-muted border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all group relative ${
                         draggedLeadId === lead.id ? "opacity-50" : ""
                       } ${isTriagem ? "border-l-4 border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : ""}`}
                     >
                       {isTriagem && (
                         <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                           ✅ Triagem Feita
                         </div>
                       )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {canTagLeads && leadTags[lead.id] && (
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tagColorClass(leadTags[lead.id])}`} />
                          )}
                          <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {(unreadByLead[lead.id] || 0) > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                                  {unreadByLead[lead.id] > 99 ? "99+" : unreadByLead[lead.id]}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{unreadByLead[lead.id]} nova(s) mensagem(ns)</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
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
                           {false && (lead as any).ai_paused && (
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Bot className="w-3.5 h-3.5 text-destructive cursor-help" />
                               </TooltipTrigger>
                               <TooltipContent side="top">
                                 <p className="text-xs font-bold">IA Pausada</p>
                               </TooltipContent>
                             </Tooltip>
                           )}
                           {canTagLeads && (
                             <div onClick={(e) => e.stopPropagation()}>
                               <LeadColorTagPicker leadId={lead.id} compact />
                             </div>
                           )}
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
            {[wonStage, lostStage].filter((s): s is PipelineStage => !!s).map((col) => {
              const isDragOverCol = dragOverColumn === col.id;
              return (
                <div
                  key={col.id}
                  className={`flex-1 border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 transition-all ${
                    isDragOverCol
                      ? col.stage_role === "won"
                        ? "border-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/10 text-[hsl(var(--status-success))]"
                        : "border-[hsl(var(--status-danger))] bg-[hsl(var(--status-danger))]/10 text-[hsl(var(--status-danger))]"
                      : "border-border text-muted-foreground bg-card/80 backdrop-blur-sm"
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className={`w-3 h-3 rounded-full ${pipelineStageColorClass(col.color_key)}`} />
                  <span className="font-semibold text-sm">{col.name}</span>
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

      {/* Floating horizontal scrollbar pinned to viewport bottom (synced with the board) */}
      {showProxy && !isDragging && (
        <div
          ref={proxyRef}
          aria-hidden="true"
          className="fixed bottom-0 left-64 right-0 z-40 overflow-x-auto overflow-y-hidden bg-background/80 backdrop-blur-sm border-t border-border"
          style={{ height: 14 }}
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmLead} onOpenChange={(open) => { if (!open) { setDeleteConfirmLead(null); setDeleteAlsoTasks(true); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirmLead?.nome}</strong>? O lead será movido para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <Checkbox checked={deleteAlsoTasks} onCheckedChange={(v) => setDeleteAlsoTasks(!!v)} />
            Também excluir as tarefas criadas para este lead
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmLead) {
                  deleteLead.mutate({ id: deleteConfirmLead.id, deleteTasks: deleteAlsoTasks });
                  setDeleteConfirmLead(null);
                  setDeleteAlsoTasks(true);
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
        targetStatus={requiredFieldsTarget?.name || ""}
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
        hasFutureTasks={!!lossReasonLead && pendingTasks.some((t) => t.lead_id === lossReasonLead.id)}
      />

      {/* Lead to Cliente Flow */}
      <LeadToClienteFlow
        lead={leadToClienteLead}
        open={!!leadToClienteLead}
        onClose={() => { setLeadToClienteLead(null); setLeadToClienteExtraFields({}); setGanhoPrevStageId(null); setGanhoTargetStageId(null); setGanhoContratoId(null); }}
        onConfirm={() => {
          // Ganho confirmado: agora sim o lead entra definitivamente na etapa won.
          const lead = leadToClienteLead;
          const targetId = ganhoTargetStageId;
          if (lead && targetId) {
            updateLead.mutate({ id: lead.id, stage_id: targetId, ...leadToClienteExtraFields } as any);
          }
        }}
        onCancel={async () => {
          // Cancelado antes da conclusão: o lead nunca saiu da etapa anterior,
          // então não há evento de won no histórico nem venda fantasma.
          const contratoId = ganhoContratoId;
          if (contratoId) {
            await supabase.from("contratos").update({ deleted_at: new Date().toISOString() }).eq("id", contratoId);
            queryClient.invalidateQueries({ queryKey: ["contratos"] });
          }
        }}
      />
    </div>
  );
};

export default KanbanBoard;
