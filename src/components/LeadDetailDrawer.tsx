import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Calendar, Send, Trash2, MessageSquare, Pencil, Clock, CheckCircle2, Circle, Lock, Plus } from "lucide-react";
import { useLeadNotes, useCreateLeadNote, useDeleteLeadNote } from "@/hooks/useLeadNotes";
import { useLeadTasks, useCompleteLeadTask, useUncompleteLeadTask, useCreateLeadTask, useUpdateLeadTask, useCreateFollowUpTask } from "@/hooks/useLeadTasks";
import { useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import RequiredFieldsModal from "@/components/RequiredFieldsModal";
import FollowUpModal from "@/components/FollowUpModal";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Indicação", "Site", "WhatsApp", "Evento", "Outro"
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "Novo Lead", label: "Novo Lead" },
  { value: "Contato Iniciado", label: "Contato Iniciado" },
  { value: "Proposta Enviada", label: "Proposta Enviada" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Contrato Enviado", label: "Contrato Enviado" },
  { value: "Fechado Ganho", label: "Fechado Ganho" },
  { value: "Fechado Perdido", label: "Fechado Perdido" },
];

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

// Inline select field
const InlineSelectField = ({
  label, value, options, onSave,
}: {
  label: string; value: string; options: string[]; onSave: (v: string) => void;
}) => {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ""} onValueChange={(v) => onSave(v)}>
        <SelectTrigger className="bg-transparent border-0 shadow-none h-auto p-0 text-sm text-foreground hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 [&>svg]:ml-1 [&>svg]:w-3 [&>svg]:h-3">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>{options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
      </Select>
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
  task, onComplete, onUpdate, isPending,
}: {
  task: any; onComplete: () => void; onUpdate: (updates: any) => void; isPending: boolean;
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
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="bg-muted border-border h-8 text-sm flex-1" />
          <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="bg-muted border-border h-8 text-sm w-28" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setTitle(task.title); setDescription(task.description || ""); setDueDate(task.due_date); setDueTime(task.due_time || ""); }}>Cancelar</Button>
          <Button size="sm" className="h-7 text-xs bg-gradient-primary hover:opacity-90" onClick={commitEdit}>Salvar</Button>
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
          {new Date(task.due_date).toLocaleDateString("pt-BR")}
          {task.due_time && ` às ${task.due_time}`}
          {task.is_cadence && <span className="ml-1 text-primary">• Cadência</span>}
        </p>
      </div>
      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
    </div>
  );
};

const LeadDetailDrawer = ({ lead, open, onOpenChange }: LeadDetailDrawerProps) => {
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

  const REQUIRED_FIELDS_STATUSES: LeadStatus[] = ["Proposta Enviada", "Contrato Enviado", "Fechado Ganho"];

  const { data: notes = [] } = useLeadNotes(lead?.id);
  const { data: tasks = [] } = useLeadTasks(lead?.id);
  const createNote = useCreateLeadNote();
  const deleteNote = useDeleteLeadNote();
  const completeTask = useCompleteLeadTask();
  const uncompleteTask = useUncompleteLeadTask();
  const createTask = useCreateLeadTask();
  const updateTask = useUpdateLeadTask();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createFollowUp = useCreateFollowUpTask();

  const handleFieldSave = (field: string, value: any) => {
    if (!lead) return;
    updateLead.mutate({ id: lead.id, [field]: value });
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    await createNote.mutateAsync({ lead_id: lead.id, content: newNote.trim() });
    setNewNote("");
  };

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    if (REQUIRED_FIELDS_STATUSES.includes(status) && (!lead.valor || lead.valor <= 0)) {
      setPendingStatus(status);
      setRequiredFieldsOpen(true);
      return;
    }
    if (status === "Proposta Enviada") {
      // Move to Follow-up instead, then show follow-up modal
      await updateLead.mutateAsync({ id: lead.id, status: "Follow-up" as LeadStatus });
      setFollowUpMode("activate");
      setFollowUpNextNumber(1);
      setFollowUpModalOpen(true);
      return;
    }
    await updateLead.mutateAsync({ id: lead.id, status });
  };

  const handleRequiredFieldsConfirm = async (fields: { valor: number }) => {
    if (!lead || !pendingStatus) return;
    if (pendingStatus === "Proposta Enviada") {
      // Move to Follow-up instead
      await updateLead.mutateAsync({ id: lead.id, status: "Follow-up" as LeadStatus, valor: fields.valor });
      setRequiredFieldsOpen(false);
      setPendingStatus(null);
      setFollowUpMode("activate");
      setFollowUpNextNumber(1);
      setFollowUpModalOpen(true);
      return;
    }
    await updateLead.mutateAsync({ id: lead.id, status: pendingStatus, valor: fields.valor });
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
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "";

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
    { label: "Entrada em Novo Lead", value: lead.data_entrada_novo_lead },
    { label: "Entrada em Contato Iniciado", value: lead.data_entrada_contato_iniciado },
    { label: "Entrada em Proposta Enviada", value: lead.data_entrada_proposta_enviada },
    { label: "Entrada em Follow-up", value: lead.data_entrada_follow_up },
    { label: "Entrada em Contrato Enviado", value: lead.data_entrada_contrato_enviado },
    { label: "Entrada em Fechado Ganho", value: lead.data_entrada_fechado_ganho },
    { label: "Entrada em Fechado Perdido", value: lead.data_entrada_fechado_perdido },
  ];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[60vw] bg-card border-border overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <SheetHeader>
            <SheetTitle className="text-xl font-display flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {lead.nome.charAt(0).toUpperCase()}
              </div>
              <InlineName value={lead.nome} onSave={(v) => handleFieldSave("nome", v)} />
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
              <SelectTrigger className="w-auto bg-muted border-border h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Nesta etapa há {formatStageDuration(stageDate)}
              </span>
            )}
            {lead.status === "Novo Lead" && !lead.iniciar_atendimento && (
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 gap-1 h-7 text-xs"
                onClick={() => updateLead.mutateAsync({ id: lead.id, iniciar_atendimento: true })}>
                <CheckCircle2 className="w-3 h-3" /> Iniciar Atendimento
              </Button>
            )}
            {lead.iniciar_atendimento && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Atendimento iniciado
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0">
          {/* Left: Details - all inline editable */}
          <div className="sm:w-[300px] flex-shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>

            <InlineField label="WhatsApp" icon={<Phone className="w-3.5 h-3.5" />}
              value={lead.whatsapp} displayValue={lead.whatsapp}
              onSave={(v) => handleFieldSave("whatsapp", v)} />

            <InlineField label="Interesse"
              value={lead.interesse || ""} displayValue={lead.interesse || ""}
              onSave={(v) => handleFieldSave("interesse", v)} />

            <InlineSelectField label="Origem" value={lead.origem || ""}
              options={ORIGEM_OPTIONS}
              onSave={(v) => handleFieldSave("origem", v)} />

            <InlineField label="Valor (R$)" type="number"
              value={lead.valor?.toString() || ""} displayValue={lead.valor ? `R$ ${lead.valor.toLocaleString("pt-BR")}` : ""}
              onSave={(v) => handleFieldSave("valor", v ? parseFloat(v) : null)} />

            <InlineField label="Data do Evento" icon={<Calendar className="w-3.5 h-3.5" />} type="date"
              value={lead.data_evento || ""} displayValue={formatDate(lead.data_evento)}
              onSave={(v) => handleFieldSave("data_evento", v || null)} />

            <InlineField label="Data do Contato" type="date"
              value={lead.data_contato || ""} displayValue={formatDate(lead.data_contato)}
              onSave={(v) => handleFieldSave("data_contato", v || null)} />

            <InlineField label="Data da Proposta" type="date"
              value={lead.data_proposta || ""} displayValue={formatDate(lead.data_proposta)}
              onSave={(v) => handleFieldSave("data_proposta", v || null)} />

            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground">Follow-ups</h4>
              {[1, 2, 3, 4, 5].map((i) => {
                const key = `follow_up_${i}` as keyof Lead;
                return (
                  <InlineField key={i} label={`Follow-up ${i}`} type="date"
                    value={(lead[key] as string) || ""} displayValue={formatDate((lead[key] as string) || null)}
                    onSave={(v) => handleFieldSave(key, v || null)} />
                );
              })}
            </div>

            {lead.status === "Fechado Perdido" && (
              <div className="space-y-1 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground">Motivo da Perda</Label>
                <InlineField label="" value={lead.motivo_perda || ""} displayValue={lead.motivo_perda || ""}
                  onSave={(v) => handleFieldSave("motivo_perda", v)} />
              </div>
            )}

            <Button variant="outline" className="w-full gap-2 mt-4" size="sm"
              onClick={() => window.open(`https://wa.me/55${lead.whatsapp}`, "_blank")}>
              <MessageSquare className="w-4 h-4" /> Abrir WhatsApp
            </Button>

            {/* System Fields */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> Campos do Sistema
              </h4>
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.label} className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">{field.label}</p>
                  <p className="text-xs text-foreground/70">{field.value ? new Date(field.value).toLocaleString("pt-BR") : "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tasks + Notes */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Tasks */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Tarefas</h3>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowNewTask(!showNewTask)}>
                  <Plus className="w-3 h-3" /> Nova Tarefa
                </Button>
              </div>

              {showNewTask && (
                <div className="space-y-2 mb-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Título da tarefa" className="bg-muted border-border h-8 text-sm" />
                  <Textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Anotação / Script (opcional)" className="bg-muted border-border text-sm min-h-[60px]" />
                  <div className="flex gap-2">
                    <Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)}
                      className="bg-muted border-border h-8 text-sm flex-1" />
                    <Input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)}
                      placeholder="Hora" className="bg-muted border-border h-8 text-sm w-28" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewTask(false)}>Cancelar</Button>
                    <Button size="sm" className="h-7 text-xs bg-gradient-primary hover:opacity-90" onClick={handleCreateTask}
                      disabled={!newTaskTitle.trim() || createTask.isPending}>Criar</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {pendingTasks.length === 0 && completedTasks.length === 0 && !showNewTask && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa.</p>
                )}
                {pendingTasks.map((task) => (
                  <EditableTaskRow key={task.id} task={task}
                    onComplete={() => handleCompleteTask(task)}
                    onUpdate={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                    isPending={completeTask.isPending} />
                ))}
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 opacity-60">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked onCheckedChange={() => uncompleteTask.mutate(task.id)}
                        disabled={uncompleteTask.isPending} className="border-muted-foreground data-[state=checked]:bg-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Concluída em {task.completed_at ? new Date(task.completed_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-3">Notas e Histórico</h3>
            <div className="flex gap-2 mb-4">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicione uma nota..." className="bg-muted border-border flex-1 min-h-[60px] text-sm" />
              <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim() || createNote.isPending}
                className="bg-gradient-primary hover:opacity-90 self-end"><Send className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma nota ainda.</p>
              ) : notes.map((note) => (
                <div key={note.id} className="bg-muted rounded-lg p-3 group border-l-2 border-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    <Button variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => deleteNote.mutate({ id: note.id, lead_id: note.lead_id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{formatDateTime(note.created_at)}</p>
                </div>
              ))}
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
    </>
  );
};

export default LeadDetailDrawer;
