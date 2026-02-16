import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Calendar, Send, Trash2, MessageSquare, Pencil, Save, X, Clock, CheckCircle2, Circle, Lock, Plus } from "lucide-react";
import { useLeadNotes, useCreateLeadNote, useDeleteLeadNote } from "@/hooks/useLeadNotes";
import { useLeadTasks, useCompleteLeadTask, useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
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

const LeadDetailDrawer = ({ lead, open, onOpenChange }: LeadDetailDrawerProps) => {
  const [newNote, setNewNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTaskTime, setNewTaskTime] = useState("");

  const { data: notes = [] } = useLeadNotes(lead?.id);
  const { data: tasks = [] } = useLeadTasks(lead?.id);
  const createNote = useCreateLeadNote();
  const deleteNote = useDeleteLeadNote();
  const completeTask = useCompleteLeadTask();
  const createTask = useCreateLeadTask();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  useEffect(() => {
    if (lead) {
      setEditData({
        nome: lead.nome, whatsapp: lead.whatsapp, interesse: lead.interesse,
        status: lead.status, origem: lead.origem, valor: lead.valor,
        data_evento: lead.data_evento, data_contato: lead.data_contato,
        data_proposta: lead.data_proposta, follow_up_1: lead.follow_up_1,
        follow_up_2: lead.follow_up_2, follow_up_3: lead.follow_up_3,
        follow_up_4: lead.follow_up_4, follow_up_5: lead.follow_up_5,
        motivo_perda: lead.motivo_perda,
      });
      setIsEditing(false);
      setShowNewTask(false);
    }
  }, [lead]);

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    await createNote.mutateAsync({ lead_id: lead.id, content: newNote.trim() });
    setNewNote("");
  };

  const handleSave = async () => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, ...editData });
      setIsEditing(false);
    } catch (e) {}
  };

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    setEditData(prev => ({ ...prev, status }));
    await updateLead.mutateAsync({ id: lead.id, status });
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
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl bg-card border-border overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-display flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {lead.nome.charAt(0).toUpperCase()}
                </div>
                {isEditing ? (
                  <Input value={editData.nome || ""} onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                    className="bg-muted border-border text-lg font-bold h-auto py-1" />
                ) : lead.nome}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" className="bg-gradient-primary hover:opacity-90 gap-1" onClick={handleSave}><Save className="w-4 h-4" /> Salvar</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsEditing(true)}><Pencil className="w-4 h-4" /> Editar</Button>
                )}
              </div>
            </div>
          </SheetHeader>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Select value={editData.status || lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
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
            {/* Iniciar Atendimento toggle */}
            {lead.status === "Novo Lead" && !lead.iniciar_atendimento && (
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90 gap-1 h-7 text-xs"
                onClick={async () => {
                  await updateLead.mutateAsync({ id: lead.id, iniciar_atendimento: true });
                }}
              >
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
          {/* Left: Details */}
          <div className="sm:w-[300px] flex-shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>

            <DetailField label="WhatsApp" icon={<Phone className="w-3.5 h-3.5" />} editing={isEditing}
              value={editData.whatsapp || ""} display={lead.whatsapp}
              onChange={(v) => setEditData(prev => ({ ...prev, whatsapp: v }))} />

            <DetailField label="Interesse" editing={isEditing}
              value={editData.interesse || ""} display={lead.interesse || "—"}
              onChange={(v) => setEditData(prev => ({ ...prev, interesse: v }))} />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Origem</Label>
              {isEditing ? (
                <Select value={editData.origem || ""} onValueChange={(v) => setEditData(prev => ({ ...prev, origem: v }))}>
                  <SelectTrigger className="bg-muted border-border h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ORIGEM_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                </Select>
              ) : <p className="text-sm text-foreground">{lead.origem || "—"}</p>}
            </div>

            <DetailField label="Valor (R$)" editing={isEditing} type="number"
              value={editData.valor?.toString() || ""} display={lead.valor ? `R$ ${lead.valor.toLocaleString("pt-BR")}` : "—"}
              onChange={(v) => setEditData(prev => ({ ...prev, valor: v ? parseFloat(v) : null }))} />

            <DetailField label="Data do Evento" icon={<Calendar className="w-3.5 h-3.5" />} editing={isEditing} type="date"
              value={editData.data_evento || ""} display={formatDate(lead.data_evento)}
              onChange={(v) => setEditData(prev => ({ ...prev, data_evento: v || null }))} />

            <DetailField label="Data do Contato" editing={isEditing} type="date"
              value={editData.data_contato || ""} display={formatDate(lead.data_contato)}
              onChange={(v) => setEditData(prev => ({ ...prev, data_contato: v || null }))} />

            <DetailField label="Data da Proposta" editing={isEditing} type="date"
              value={editData.data_proposta || ""} display={formatDate(lead.data_proposta)}
              onChange={(v) => setEditData(prev => ({ ...prev, data_proposta: v || null }))} />

            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground">Follow-ups</h4>
              {[1, 2, 3, 4, 5].map((i) => {
                const key = `follow_up_${i}` as keyof typeof editData;
                return (
                  <DetailField key={i} label={`Follow-up ${i}`} editing={isEditing} type="date"
                    value={(editData as any)[key] || ""} display={formatDate((lead as any)[key])}
                    onChange={(v) => setEditData(prev => ({ ...prev, [key]: v || null }))} />
                );
              })}
            </div>

            {(lead.status === "Fechado Perdido" || editData.status === "Fechado Perdido") && (
              <div className="space-y-1 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground">Motivo da Perda</Label>
                {isEditing ? (
                  <Textarea value={editData.motivo_perda || ""} onChange={(e) => setEditData(prev => ({ ...prev, motivo_perda: e.target.value }))}
                    className="bg-muted border-border text-sm min-h-[60px]" />
                ) : <p className="text-sm text-foreground">{lead.motivo_perda || "—"}</p>}
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
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <Checkbox checked={false} onCheckedChange={() => completeTask.mutate(task)}
                      disabled={completeTask.isPending} className="border-primary data-[state=checked]:bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        {task.due_time && ` às ${task.due_time}`}
                        {task.is_cadence && <span className="ml-1 text-primary">• Cadência</span>}
                      </p>
                    </div>
                    <Circle className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
                  </div>
                ))}
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 opacity-60">
                    <Checkbox checked disabled className="border-muted-foreground" />
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
  );
};

const DetailField = ({ label, value, display, editing, onChange, icon, type = "text" }: {
  label: string; value: string; display: string; editing: boolean;
  onChange: (v: string) => void; icon?: React.ReactNode; type?: string;
}) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
    {editing ? (
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-muted border-border h-8 text-sm" />
    ) : <p className="text-sm text-foreground">{display}</p>}
  </div>
);

export default LeadDetailDrawer;
