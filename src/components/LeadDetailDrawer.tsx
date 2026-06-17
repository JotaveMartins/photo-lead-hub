import { useState, useEffect, useRef } from "react";
import DatePickerField from "@/components/DatePickerField";
import TimePickerField from "@/components/TimePickerField";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseLocalDate } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
 import { Phone, Calendar, Send, Trash2, MessageSquare, Pencil, Clock, CheckCircle2, Circle, Lock, Plus, CalendarCheck, ArrowRight, FileText, History, Bot, Pause, Play, MapPin, BadgeDollarSign } from "lucide-react";
import { ChevronDown, Check } from "lucide-react";
import { useLeadNotes, useCreateLeadNote, useDeleteLeadNote } from "@/hooks/useLeadNotes";
import { useLeadTasks, useCompleteLeadTask, useUncompleteLeadTask, useCreateLeadTask, useUpdateLeadTask, useCreateFollowUpTask, useDeleteLeadTask } from "@/hooks/useLeadTasks";
import { useLeadHistory, useCreateLeadHistory } from "@/hooks/useLeadHistory";
import { useLeads, useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useAiActive } from "@/hooks/useAiActive";
import { useQueryClient } from "@tanstack/react-query";
import RequiredFieldsModal from "@/components/RequiredFieldsModal";
import LeadToClienteFlow from "@/components/LeadToClienteFlow";
import FollowUpModal from "@/components/FollowUpModal";
import LossReasonModal from "@/components/LossReasonModal";
import InteresseSelect from "@/components/InteresseSelect";
import LeadConversation from "@/components/LeadConversation";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "Novo Lead", label: "Novo Lead" },
   { value: "Contato Iniciado", label: "Contato Iniciado" },
   { value: "Triagem Feita", label: "Triagem Feita" },
  { value: "Proposta Enviada", label: "Proposta Enviada" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Contrato Enviado", label: "Contrato Enviado" },
  { value: "Fechado Ganho", label: "Fechado Ganho" },
  { value: "Fechado Perdido", label: "Fechado Perdido" },
];

const getStageStyles = (status: LeadStatus) => {
  switch (status) {
    case "Fechado Ganho":
      return "bg-status-success/15 text-status-success border-status-success/30 dot-bg-status-success";
    case "Fechado Perdido":
      return "bg-status-danger/15 text-status-danger border-status-danger/30 dot-bg-status-danger";
    case "Proposta Enviada":
    case "Follow-up":
      return "bg-status-warning/15 text-status-warning border-status-warning/30 dot-bg-status-warning";
    case "Contato Iniciado":
    case "Triagem Feita":
    case "Contrato Enviado":
      return "bg-status-info/15 text-status-info border-status-info/30 dot-bg-status-info";
    default:
      return "bg-muted text-muted-foreground border-border dot-bg-muted-foreground";
  }
};

const StageDot = ({ status }: { status: LeadStatus }) => {
  const color =
    status === "Fechado Ganho" ? "bg-status-success"
    : status === "Fechado Perdido" ? "bg-status-danger"
    : status === "Proposta Enviada" || status === "Follow-up" ? "bg-status-warning"
    : status === "Contato Iniciado" || status === "Triagem Feita" || status === "Contrato Enviado" ? "bg-status-info"
    : "bg-muted-foreground";
  return <span className={`w-1.5 h-1.5 rounded-full ${color}`} />;
};

interface StageSelectProps {
  value: LeadStatus;
  onChange: (v: LeadStatus) => void;
}
const StageSelect = ({ value, onChange }: StageSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: aiActive = false } = useAiActive();
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const styles = getStageStyles(value);
  const visibleStatusOptions = STATUS_OPTIONS.filter(
    (opt) => opt.value !== "Triagem Feita" || aiActive || value === "Triagem Feita"
  );
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium border transition-colors hover:opacity-90 ${styles}`}
      >
        <StageDot status={value} />
        {value}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {visibleStatusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setOpen(false); if (opt.value !== value) onChange(opt.value); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${opt.value === value ? "bg-muted/60" : ""}`}
            >
              <StageDot status={opt.value} />
              <span className="text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Inline editable field - click to edit, blur/enter to save
const InlineField = ({
  label, value, displayValue, icon, type = "text",
  onSave,
}: {
  label: string; value: string; displayValue: string; icon?: React.ReactNode;
  type?: string; onSave: (v: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      {editing ? (
        <Input ref={inputRef} type={type} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          className="bg-muted border-border h-8 text-sm" />
      ) : (
        <p className="text-sm text-foreground cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors min-h-[28px] flex items-center"
          onClick={() => setEditing(true)}>
          {displayValue || "—"}
          <Pencil className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
        </p>
      )}
    </div>
  );
};

// Inline select field (native)
const InlineSelectField = ({
  label, value, options, onSave,
}: {
  label: string; value: string; options: string[]; onSave: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-muted px-2.5 py-1.5 text-sm text-foreground hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || "—"}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md">
            <div className="max-h-52 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => { onSave(""); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors ${!value ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                <span>—</span>
                {!value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onSave(o); setOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors ${value === o ? "text-foreground font-medium bg-muted/40" : "text-foreground"}`}
                >
                  <span>{o}</span>
                  {value === o && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Inline editable name
const InlineName = ({ value, onSave }: { value: string; onSave: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
  };

  if (editing) {
    return <Input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className="bg-muted border-border text-lg font-bold h-auto py-1" />;
  }
  return (
    <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors" onClick={() => setEditing(true)}>
      {value}
    </span>
  );
};

// Editable task row
const EditableTaskRow = ({
  task, onComplete, onUpdate, onDelete, isPending,
}: {
  task: any; onComplete: () => void; onUpdate: (updates: any) => void; onDelete: () => void; isPending: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date);
  const [dueTime, setDueTime] = useState(task.due_time || "");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setDueDate(task.due_date);
    setDueTime(task.due_time || "");
  }, [task]);

  const commitEdit = () => {
    setEditing(false);
    const updates: any = {};
    if (title !== task.title) updates.title = title;
    if (description !== (task.description || "")) updates.description = description || null;
    if (dueDate !== task.due_date) updates.due_date = dueDate;
    if (dueTime !== (task.due_time || "")) updates.due_time = dueTime || null;
    if (Object.keys(updates).length > 0) onUpdate(updates);
  };

  if (editing) {
    return (
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)}
          className="bg-muted border-border h-8 text-sm font-medium" placeholder="Título" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
          className="bg-muted border-border text-sm min-h-[50px]" placeholder="Anotação / Script (opcional)" />
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePickerField value={dueDate} onChange={setDueDate} placeholder="Data" />
          </div>
          <TimePickerField value={dueTime} onChange={setDueTime} />
        </div>
        <div className="flex gap-2 justify-between">
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-3 h-3 mr-1" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setTitle(task.title); setDescription(task.description || ""); setDueDate(task.due_date); setDueTime(task.due_time || ""); }}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs bg-gradient-primary hover:opacity-90" onClick={commitEdit}>Salvar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 group cursor-pointer"
      onClick={() => setEditing(true)}>
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={false} onCheckedChange={onComplete}
          disabled={isPending} className="border-primary data-[state=checked]:bg-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{task.title}</p>
        {task.description && <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>}
        <p className="text-[11px] text-muted-foreground">
          {(() => { const [y,m,d] = task.due_date.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("pt-BR"); })()}
          {task.due_time && ` às ${task.due_time}`}
          {task.is_cadence && <span className="ml-1 text-primary">• Cadência</span>}
        </p>
      </div>
      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
    </div>
  );
};

// Editable system field with warning confirmation
const EditableSystemField = ({
  label, value, isTimestamp, onSave,
}: {
  label: string; value: string | null; isTimestamp: boolean; onSave: (v: string) => void;
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");

  const displayValue = value
    ? isTimestamp
      ? new Date(value).toLocaleString("pt-BR")
      : parseLocalDate(value).toLocaleDateString("pt-BR")
    : "—";

  const handleClick = () => {
    if (value) {
      if (isTimestamp) {
        const d = new Date(value);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        setDraftDate(`${yyyy}-${mm}-${dd}`);
        setDraftTime(`${hh}:${mi}`);
      } else {
        setDraftDate(value);
        setDraftTime("");
      }
    } else {
      setDraftDate("");
      setDraftTime("");
    }
    setShowWarning(true);
  };

  const handleConfirmWarning = () => {
    setShowWarning(false);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (isTimestamp) {
      if (draftDate) {
        const [y, m, d] = draftDate.split("-").map(Number);
        const local = new Date(y, m - 1, d, 12, 0, 0, 0);
        onSave(local.toISOString());
      }
    } else {
      onSave(draftDate);
    }
  };

  return (
    <>
      <div className="space-y-0.5">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {editing ? (
          <div className="flex flex-col gap-1">
            <DatePickerField value={draftDate} onChange={setDraftDate} className="h-8 text-xs w-full" />
            <div className="flex gap-1 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5">Cancelar</button>
              <button type="button" onClick={commit} className="text-[10px] text-primary hover:underline px-1.5">Salvar</button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground/70 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors flex items-center"
            onClick={handleClick}>
            {displayValue}
            <Pencil className="w-2.5 h-2.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-50" />
          </p>
        )}
      </div>
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Editar campo do sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Este campo é preenchido automaticamente pelo sistema. Alterá-lo manualmente pode causar inconsistências em relatórios e outras funcionalidades. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWarning} className="bg-gradient-primary hover:opacity-90">
              Sim, editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const LeadDetailDrawer = ({ lead: leadProp, open, onOpenChange }: LeadDetailDrawerProps) => {
  const queryClient = useQueryClient();
  // Always use fresh data from the query cache instead of stale prop
  const { data: allLeads = [] } = useLeads();
  const lead = leadProp ? (allLeads.find(l => l.id === leadProp.id) || leadProp) : null;
  const [newNote, setNewNote] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTaskTime, setNewTaskTime] = useState("");
  const [requiredFieldsOpen, setRequiredFieldsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  // Follow-up modal state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpMode, setFollowUpMode] = useState<"activate" | "next">("activate");
  const [followUpNextNumber, setFollowUpNextNumber] = useState(1);
  // Loss reason modal state
  const [lossReasonOpen, setLossReasonOpen] = useState(false);
  // Lead to cliente flow state
   const [leadToClienteFlowOpen, setLeadToClienteFlowOpen] = useState(false);
   const [activeTab, setActiveTab] = useState<"historico" | "conversa">("historico");

  const REQUIRED_FIELDS_STATUSES: LeadStatus[] = ["Proposta Enviada", "Contrato Enviado", "Fechado Ganho"];

  // When user opens the "Conversa" tab, mark all inbox conversations for this
  // lead as read so the red badge on the Kanban card disappears.
  useEffect(() => {
    if (activeTab !== "conversa" || !lead?.id) return;
    (async () => {
      const { error } = await supabase
        .from("inbox_conversations")
        .update({ unread_count: 0 })
        .eq("lead_id", lead.id)
        .gt("unread_count", 0);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["lead_unread_counts"] });
        queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
        queryClient.invalidateQueries({ queryKey: ["inbox_total_unread"] });
      }
    })();
  }, [activeTab, lead?.id, queryClient]);

  const { data: notes = [] } = useLeadNotes(lead?.id);
  const { data: tasks = [] } = useLeadTasks(lead?.id);
  const { data: history = [] } = useLeadHistory(lead?.id);
  const createNote = useCreateLeadNote();
  const deleteNote = useDeleteLeadNote();
  const completeTask = useCompleteLeadTask();
  const uncompleteTask = useUncompleteLeadTask();
  const createTask = useCreateLeadTask();
  const updateTask = useUpdateLeadTask();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createFollowUp = useCreateFollowUpTask();
  const deleteTask = useDeleteLeadTask();
  const [deleteLeadConfirmOpen, setDeleteLeadConfirmOpen] = useState(false);
  const createHistory = useCreateLeadHistory();

  const FIELD_LABELS: Record<string, string> = {
    nome: "Nome", whatsapp: "WhatsApp", interesse: "Interesse", origem: "Origem",
    valor: "Valor", data_evento: "Data do Evento", data_contato: "Data do Contato",
    data_proposta: "Data da Proposta", motivo_perda: "Motivo da Perda", observacao_perda: "Observação da Perda", status: "Status",
    iniciar_atendimento: "Iniciar Atendimento", package_id: "Pacote",
    data_entrada_novo_lead: "Entrada em Novo Lead",
    data_entrada_contato_iniciado: "Entrada em Contato Iniciado",
    data_entrada_proposta_enviada: "Entrada em Proposta Enviada",
    data_entrada_follow_up: "Entrada em Follow-up",
    data_entrada_contrato_enviado: "Entrada em Contrato Enviado",
    data_entrada_fechado_ganho: "Entrada em Fechado Ganho",
    data_entrada_fechado_perdido: "Entrada em Fechado Perdido",
    cadencia_1: "Cadência 1", cadencia_2: "Cadência 2", cadencia_3: "Cadência 3",
    cadencia_4: "Cadência 4", cadencia_5: "Cadência 5",
    follow_up_1: "Follow-up 1", follow_up_2: "Follow-up 2", follow_up_3: "Follow-up 3",
    follow_up_4: "Follow-up 4", follow_up_5: "Follow-up 5",
  };

  const handlePauseAI = async () => {
    if (!lead) return;
    handleFieldSave("ai_paused", true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: conversations } = await supabase
      .from("inbox_conversations")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("status", "pending_ai");
    if (conversations && conversations.length > 0) {
      await Promise.all(
        conversations.map(conv =>
          supabase.from("inbox_conversations").update({ status: "open" }).eq("id", conv.id)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
    }
  };

  const handleFieldSave = (field: string, value: any) => {
    if (!lead) return;
    const oldValue = (lead as any)[field];
    const oldStr = oldValue != null ? String(oldValue) : null;
    const newStr = value != null ? String(value) : null;
    if (oldStr !== newStr) {
      createHistory.mutate({
        lead_id: lead.id,
        field_name: field,
        field_label: FIELD_LABELS[field] || field,
        old_value: oldStr,
        new_value: newStr,
      });
    }
    updateLead.mutate({ id: lead.id, [field]: value });
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    await createNote.mutateAsync({ lead_id: lead.id, content: newNote.trim() });
    setNewNote("");
  };

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    if (status === "Fechado Perdido") {
      setLossReasonOpen(true);
      return;
    }
    const isProposalTarget = status === "Proposta Enviada";
    const needsRequiredFields = REQUIRED_FIELDS_STATUSES.includes(status) && (
      (!lead.valor || lead.valor <= 0) ||
      (isProposalTarget && (!lead.data_proposta || !lead.data_evento || !lead.interesse || !lead.origem))
    );
    if (needsRequiredFields) {
      setPendingStatus(status);
      setRequiredFieldsOpen(true);
      return;
    }
    if (status === "Proposta Enviada") {
      await updateLead.mutateAsync({ id: lead.id, status: "Follow-up" as LeadStatus });
      setFollowUpMode("activate");
      setFollowUpNextNumber(1);
      setFollowUpModalOpen(true);
      return;
    }
    if (status === "Fechado Ganho") {
      await updateLead.mutateAsync({ id: lead.id, status });
      setLeadToClienteFlowOpen(true);
      return;
    }
    await updateLead.mutateAsync({ id: lead.id, status });
  };

  const handleLossReasonConfirm = async (data: { motivo_perda: string; observacao_perda: string | null; deleteFutureTasks: boolean }) => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      status: "Fechado Perdido" as LeadStatus,
      motivo_perda: data.motivo_perda,
      observacao_perda: data.observacao_perda,
    });
    if (data.deleteFutureTasks) {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("lead_tasks")
        .delete()
        .eq("lead_id", lead.id)
        .eq("completed", false);
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
    }
    setLossReasonOpen(false);
  };

  const handleRequiredFieldsConfirm = async (fields: { valor: number; data_proposta?: string; data_evento?: string; interesse?: string; origem?: string }) => {
    if (!lead || !pendingStatus) return;
    if (pendingStatus === "Proposta Enviada") {
      await updateLead.mutateAsync({ id: lead.id, status: "Follow-up" as LeadStatus, ...fields });
      setRequiredFieldsOpen(false);
      setPendingStatus(null);
      setFollowUpMode("activate");
      setFollowUpNextNumber(1);
      setFollowUpModalOpen(true);
      return;
    }
    if (pendingStatus === "Fechado Ganho") {
      await updateLead.mutateAsync({ id: lead.id, status: pendingStatus, ...fields });
      setRequiredFieldsOpen(false);
      setPendingStatus(null);
      setLeadToClienteFlowOpen(true);
      return;
    }
    await updateLead.mutateAsync({ id: lead.id, status: pendingStatus, ...fields });
    setRequiredFieldsOpen(false);
    setPendingStatus(null);
  };

  const handleCompleteTask = (task: any) => {
    completeTask.mutate(task, {
      onSuccess: (result) => {
        if (result.isFollowUp && lead) {
          setFollowUpMode("next");
          setFollowUpNextNumber(result.followUpNumber);
          setFollowUpModalOpen(true);
        }
      },
    });
  };

  const handleFollowUpConfirm = (date: string) => {
    if (!lead) return;
    createFollowUp.mutate({ leadId: lead.id, followUpNumber: followUpNextNumber, dueDate: date });
  };

  const handleFollowUpDecline = () => {
    // Do nothing
  };

  const handleCreateTask = async () => {
    if (!lead || !newTaskTitle.trim()) return;
    await createTask.mutateAsync({
      lead_id: lead.id,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      due_date: newTaskDate,
      due_time: newTaskTime || undefined,
    });
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskTime("");
    setShowNewTask(false);
  };

  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR");
  const formatDate = (d: string | null) => {
    if (!d) return "";
    // Parse date-only strings (YYYY-MM-DD) as local to avoid UTC timezone shift
    const dateOnly = d.substring(0, 10);
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
  };

  const formatStageDuration = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "hoje";
    if (diffDays === 1) return "1 dia";
    return `${diffDays} dias`;
  };

  if (!lead) return null;

  const stageDate = (() => {
    switch (lead.status) {
      case "Novo Lead": return lead.data_entrada_novo_lead;
      case "Contato Iniciado": return lead.data_entrada_contato_iniciado;
      case "Proposta Enviada": return lead.data_entrada_proposta_enviada;
      case "Follow-up": return lead.data_entrada_follow_up;
      case "Contrato Enviado": return lead.data_entrada_contrato_enviado;
      case "Fechado Ganho": return lead.data_entrada_fechado_ganho;
      case "Fechado Perdido": return lead.data_entrada_fechado_perdido;
      default: return null;
    }
  })();

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const SYSTEM_FIELDS = [
    { label: "Entrada em Novo Lead", value: lead.data_entrada_novo_lead, field: "data_entrada_novo_lead" },
    { label: "Entrada em Contato Iniciado", value: lead.data_entrada_contato_iniciado, field: "data_entrada_contato_iniciado" },
    { label: "Entrada em Proposta Enviada", value: lead.data_entrada_proposta_enviada, field: "data_entrada_proposta_enviada" },
    { label: "Entrada em Follow-up", value: lead.data_entrada_follow_up, field: "data_entrada_follow_up" },
    { label: "Entrada em Contrato Enviado", value: lead.data_entrada_contrato_enviado, field: "data_entrada_contrato_enviado" },
    { label: "Entrada em Fechado Ganho", value: lead.data_entrada_fechado_ganho, field: "data_entrada_fechado_ganho" },
    { label: "Entrada em Fechado Perdido", value: lead.data_entrada_fechado_perdido, field: "data_entrada_fechado_perdido" },
  ];

  const CADENCE_FIELDS = [
    { label: "Cadência 1", value: (lead as any).cadencia_1, field: "cadencia_1", isTimestamp: true },
    { label: "Cadência 2", value: (lead as any).cadencia_2, field: "cadencia_2", isTimestamp: true },
    { label: "Cadência 3", value: (lead as any).cadencia_3, field: "cadencia_3", isTimestamp: true },
    { label: "Cadência 4", value: (lead as any).cadencia_4, field: "cadencia_4", isTimestamp: true },
    { label: "Cadência 5", value: (lead as any).cadencia_5, field: "cadencia_5", isTimestamp: true },
  ];

  const FOLLOWUP_FIELDS = [
    { label: "Follow-up 1", value: lead.follow_up_1, field: "follow_up_1", isTimestamp: false },
    { label: "Follow-up 2", value: lead.follow_up_2, field: "follow_up_2", isTimestamp: false },
    { label: "Follow-up 3", value: lead.follow_up_3, field: "follow_up_3", isTimestamp: false },
    { label: "Follow-up 4", value: lead.follow_up_4, field: "follow_up_4", isTimestamp: false },
    { label: "Follow-up 5", value: lead.follow_up_5, field: "follow_up_5", isTimestamp: false },
  ];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[60vw] bg-card border-border flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <SheetHeader>
            <SheetTitle className="text-xl font-display flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {lead.nome.charAt(0).toUpperCase()}
              </div>
              <InlineName value={lead.nome} onSave={(v) => handleFieldSave("nome", v)} />
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteLeadConfirmOpen(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <StageSelect value={lead.status} onChange={handleStatusChange} />
            {stageDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Nesta etapa há {formatStageDuration(stageDate)}
              </span>
            )}
            {lead.status === "Novo Lead" && !lead.iniciar_atendimento && (
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 gap-1 h-7 text-xs"
                onClick={async () => {
                  await updateLead.mutateAsync({ id: lead.id, iniciar_atendimento: true });
                  queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
                }}>
                <CheckCircle2 className="w-3 h-3" /> Iniciar Atendimento
              </Button>
            )}
             {lead.iniciar_atendimento && (
               <span className="text-xs text-green-500 flex items-center gap-1">
                 <CheckCircle2 className="w-3 h-3" /> Atendimento iniciado
               </span>
             )}
 
             <div className="flex items-center gap-2 ml-auto">
               {(lead as any).ai_paused ? (
                 <>
                   <div className="flex items-center gap-1 bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full border border-destructive/20">
                     <Pause className="w-3 h-3" /> IA Pausada
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleFieldSave("ai_paused", false)}>
                     <Play className="w-3 h-3" /> Retomar IA
                   </Button>
                 </>
               ) : (
                 <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-primary border-primary/30" onClick={handlePauseAI}>
                   <Pause className="w-3 h-3" /> Pausar IA
                 </Button>
               )}
             </div>
            {(lead.status === "Follow-up" || lead.status === "Novo Lead") && pendingTasks.filter(t => t.title.startsWith("Follow-up")).length === 0 && (
              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  const completedFollowUps = tasks.filter(t => t.title.startsWith("Follow-up") && t.completed).length;
                  setFollowUpMode(completedFollowUps === 0 ? "activate" : "next");
                  setFollowUpNextNumber(completedFollowUps + 1);
                  setFollowUpModalOpen(true);
                }}>
                <CalendarCheck className="w-3 h-3" /> Ativar Sequência de Follow-up
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row min-h-0 overflow-hidden">
          {/* Left: Details - all inline editable */}
          <div className="sm:w-[340px] flex-shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto overflow-x-hidden">
            <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>

            <InlineField label="WhatsApp" icon={<Phone className="w-3.5 h-3.5" />}
              value={lead.whatsapp} displayValue={lead.whatsapp}
              onSave={(v) => handleFieldSave("whatsapp", v)} />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Interesse</Label>
              <InteresseSelect
                value={lead.interesse || ""}
                onValueChange={(v) => handleFieldSave("interesse", v || null)}
                manageable={false}
              />
            </div>

            <InlineSelectField label="Origem" value={lead.origem || ""}
              options={ORIGEM_OPTIONS}
              onSave={(v) => handleFieldSave("origem", v)} />

            <InlineField label="Valor (R$)" type="number"
              value={lead.valor?.toString() || ""} displayValue={lead.valor ? `R$ ${lead.valor.toLocaleString("pt-BR")}` : ""}
              onSave={(v) => handleFieldSave("valor", v ? parseFloat(v) : null)} />

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Data do Evento</span>
              <DatePickerField value={lead.data_evento || ""} onChange={(v) => handleFieldSave("data_evento", v || null)} className="h-8 text-xs w-[150px]" />
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Data do Contato</span>
              <DatePickerField value={lead.data_contato || ""} onChange={(v) => handleFieldSave("data_contato", v || null)} className="h-8 text-xs w-[150px]" />
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Data da Proposta</span>
              <DatePickerField value={lead.data_proposta || ""} onChange={(v) => handleFieldSave("data_proposta", v || null)} className="h-8 text-xs w-[150px]" />
            </div>

            {lead.status === "Fechado Perdido" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <InlineSelectField label="Motivo da Perda" value={lead.motivo_perda || ""}
                  options={["Sem orçamento disponível", "Fechou com outro fotógrafo", "Sem resposta", "Cancelou ou adiou o evento", "Data indisponível", "Lead desqualificado", "Outro"]}
                  onSave={(v) => handleFieldSave("motivo_perda", v)} />
                <InlineField label="Observação da Perda" value={(lead as any).observacao_perda || ""} displayValue={(lead as any).observacao_perda || ""}
                  onSave={(v) => handleFieldSave("observacao_perda", v || null)} />
              </div>
            )}

            {/* System Fields */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> Campos do Sistema
              </h4>
              {SYSTEM_FIELDS.map((field) => (
                <EditableSystemField key={field.label} label={field.label}
                  value={field.value} isTimestamp
                  onSave={(v) => handleFieldSave(field.field, v || null)} />
              ))}

              {/* Cadência Pré-Proposta */}
              <h4 className="text-xs font-semibold text-muted-foreground pt-2">Cadência Pré-Proposta</h4>
              {CADENCE_FIELDS.map((field) => (
                <EditableSystemField key={field.label} label={field.label}
                  value={field.value} isTimestamp={field.isTimestamp}
                  onSave={(v) => handleFieldSave(field.field, v || null)} />
              ))}

              {/* Follow-ups Pós-Proposta */}
              <h4 className="text-xs font-semibold text-muted-foreground pt-2">Follow-ups Pós-Proposta</h4>
              {FOLLOWUP_FIELDS.map((field) => (
                <EditableSystemField key={field.label} label={field.label}
                  value={field.value} isTimestamp={field.isTimestamp}
                  onSave={(v) => handleFieldSave(field.field, v || null)} />
              ))}
            </div>
          </div>

           {/* Right: Tabs and Content */}
           <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center gap-4 px-4 border-b border-border">
               <button
                 onClick={() => setActiveTab("historico")}
                 className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "historico" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
               >
                 Histórico
               </button>
               <button
                 onClick={() => setActiveTab("conversa")}
                 className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "conversa" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
               >
                 Conversa
               </button>
             </div>
 
             <div className={`flex-1 min-h-0 ${activeTab === "conversa" ? "overflow-hidden" : "overflow-y-auto p-4"}`}>
               {activeTab === "historico" ? (
                 <>
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                 <History className="w-4 h-4 text-muted-foreground" />
                 Atividades
               </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowNewTask(!showNewTask)}>
                  <Plus className="w-3 h-3" /> Tarefa
                </Button>
              </div>
            </div>

            {/* New task form */}
            {showNewTask && (
              <div className="space-y-2 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Título da tarefa" className="bg-muted border-border h-8 text-sm" />
                <Textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Anotação / Script (opcional)" className="bg-muted border-border text-sm min-h-[60px]" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <DatePickerField value={newTaskDate} onChange={setNewTaskDate} placeholder="Data" />
                  </div>
                   <TimePickerField value={newTaskTime} onChange={setNewTaskTime} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewTask(false)}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-xs bg-gradient-primary hover:opacity-90" onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim() || createTask.isPending}>Criar</Button>
                </div>
              </div>
            )}

            {/* New note input */}
            <div className="flex gap-2 mb-4">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicione uma nota..." className="bg-muted border-border flex-1 min-h-[50px] text-sm" />
              <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim() || createNote.isPending}
                className="bg-gradient-primary hover:opacity-90 self-end"><Send className="w-4 h-4" /></Button>
            </div>

            {/* Unified timeline */}
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {(() => {
                  // Build unified timeline items
                  type TimelineItem = {
                    id: string;
                    type: "task_pending" | "task_completed" | "note" | "change";
                    date: string;
                    data: any;
                  };

                  const items: TimelineItem[] = [];

                  // Pending tasks (sorted by due_date)
                  pendingTasks.forEach(t => items.push({
                    id: `task-${t.id}`, type: "task_pending", date: t.created_at, data: t,
                  }));

                  // Completed tasks
                  completedTasks.forEach(t => items.push({
                    id: `task-done-${t.id}`, type: "task_completed",
                    date: t.completed_at || t.created_at, data: t,
                  }));

                  // Notes
                  notes.forEach(n => items.push({
                    id: `note-${n.id}`, type: "note", date: n.created_at, data: n,
                  }));

                  // History changes
                  history.forEach(h => items.push({
                    id: `history-${h.id}`, type: "change", date: h.created_at, data: h,
                  }));

                  // Sort by date descending (newest first), but pin notes to the top
                  items.sort((a, b) => {
                    if (a.type === "note" && b.type !== "note") return -1;
                    if (a.type !== "note" && b.type === "note") return 1;
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                  });

                  if (items.length === 0) {
                    return <p className="text-xs text-muted-foreground text-center py-8 ml-8">Nenhuma atividade ainda.</p>;
                  }

                  return items.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-4 relative">
                      {/* Icon */}
                      <div className="w-[30px] flex-shrink-0 flex justify-center z-10">
                        {item.type === "task_pending" && (
                          <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            <Circle className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        {item.type === "task_completed" && (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        {item.type === "note" && (
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        {item.type === "change" && (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        {item.type === "task_pending" && (
                          <EditableTaskRow task={item.data}
                            onComplete={() => handleCompleteTask(item.data)}
                            onUpdate={(updates) => updateTask.mutate({ id: item.data.id, ...updates })}
                            onDelete={() => deleteTask.mutate(item.data.id)}
                            isPending={completeTask.isPending} />
                        )}

                        {item.type === "task_completed" && (
                          <div className="p-2.5 rounded-lg bg-muted/50 opacity-70 group">
                            <div className="flex items-center gap-2">
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked onCheckedChange={() => uncompleteTask.mutate(item.data.id)}
                                  disabled={uncompleteTask.isPending} className="border-muted-foreground data-[state=checked]:bg-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground line-through">{item.data.title}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Concluída em {item.data.completed_at ? new Date(item.data.completed_at).toLocaleString("pt-BR") : "—"}
                            </p>
                          </div>
                        )}

                        {item.type === "note" && (
                          <div className="bg-muted rounded-lg p-3 group border-l-2 border-primary/50">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-foreground whitespace-pre-wrap">{item.data.content}</p>
                              <Button variant="ghost" size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={() => deleteNote.mutate({ id: item.data.id, lead_id: item.data.lead_id })}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">{formatDateTime(item.data.created_at)}</p>
                          </div>
                        )}

                        {item.type === "change" && (
                          <div className="py-1">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{item.data.field_label}</span>
                              {item.data.old_value ? (
                                <>{": "}<span className="text-muted-foreground line-through">{item.data.old_value}</span> → <span>{item.data.new_value || "—"}</span></>
                              ) : (
                                <>{": "}<span>{item.data.new_value || "—"}</span></>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{formatDateTime(item.data.created_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                 })()}
               </div>
             </div>
                 </>
                ) : (
                  lead ? (
                    <div className="h-full p-3">
                      <LeadConversation leadId={lead.id} leadWhatsapp={lead.whatsapp} />
                    </div>
                  ) : null
                )}
             </div>
           </div>
        </div>
      </SheetContent>
    </Sheet>

    <RequiredFieldsModal
      open={requiredFieldsOpen}
      onOpenChange={(open) => { setRequiredFieldsOpen(open); if (!open) setPendingStatus(null); }}
      leadName={lead?.nome || ""}
      targetStatus={pendingStatus || ""}
      currentValor={lead?.valor ?? null}
      currentDataProposta={lead?.data_proposta ?? null}
      currentDataEvento={lead?.data_evento ?? null}
      currentInteresse={lead?.interesse ?? null}
      currentOrigem={lead?.origem ?? null}
      onConfirm={handleRequiredFieldsConfirm}
    />

    <FollowUpModal
      open={followUpModalOpen}
      onOpenChange={setFollowUpModalOpen}
      mode={followUpMode}
      nextNumber={followUpNextNumber}
      leadName={lead?.nome || ""}
      onConfirm={handleFollowUpConfirm}
      onDecline={handleFollowUpDecline}
    />

    <AlertDialog open={deleteLeadConfirmOpen} onOpenChange={setDeleteLeadConfirmOpen}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Excluir lead</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <span className="font-semibold text-foreground">{lead?.nome}</span>? Esta ação não pode ser desfeita. Todas as tarefas, notas e histórico serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (lead) {
                deleteLead.mutate(lead.id, { onSuccess: () => onOpenChange(false) });
              }
            }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <LossReasonModal
      open={lossReasonOpen}
      onOpenChange={setLossReasonOpen}
      leadName={lead?.nome || ""}
      onConfirm={handleLossReasonConfirm}
      hasFutureTasks={pendingTasks.length > 0}
    />
    <LeadToClienteFlow
      lead={lead}
      open={leadToClienteFlowOpen}
      onClose={() => setLeadToClienteFlowOpen(false)}
    />
    </>
  );
};

export default LeadDetailDrawer;
