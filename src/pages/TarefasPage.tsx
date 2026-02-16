import { useState, useMemo } from "react";
import { CheckSquare, Plus, Calendar, Clock, User, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LeadDetailDrawer from "@/components/LeadDetailDrawer";
import { useAllTasks, useCompleteLeadTask, useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useLeads } from "@/hooks/useLeads";
import { isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const TarefasPage = () => {
  const { data: allTasks = [] } = useAllTasks();
  const { data: leads = [] } = useLeads();
  const completeTask = useCompleteLeadTask();
  const createTask = useCreateLeadTask();

  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue" | "today">("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newDueTime, setNewDueTime] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const today = startOfDay(new Date());

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const dueDate = parseISO(task.due_date);
      switch (filter) {
        case "pending": return !task.completed;
        case "completed": return task.completed;
        case "overdue": return !task.completed && isBefore(dueDate, today);
        case "today": return !task.completed && isToday(dueDate);
        default: return true;
      }
    });
  }, [allTasks, filter, today]);

  const stats = useMemo(() => {
    const pending = allTasks.filter(t => !t.completed);
    const overdue = pending.filter(t => isBefore(parseISO(t.due_date), today));
    const todayTasks = pending.filter(t => isToday(parseISO(t.due_date)));
    return { pending: pending.length, overdue: overdue.length, today: todayTasks.length, total: allTasks.length };
  }, [allTasks, today]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newLeadId) return;
    await createTask.mutateAsync({
      lead_id: newLeadId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      due_date: newDueDate,
      due_time: newDueTime || undefined,
    });
    setIsModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewDueTime("");
    setNewLeadId("");
  };

  const getTaskStatusIndicator = (task: typeof allTasks[0]) => {
    if (task.completed) return { color: "text-muted-foreground", label: "Concluída" };
    const dueDate = parseISO(task.due_date);
    if (isBefore(dueDate, today)) return { color: "text-red-500", label: "Atrasada" };
    if (isToday(dueDate)) return { color: "text-green-500", label: "Hoje" };
    return { color: "text-muted-foreground/50", label: "Futura" };
  };

  const handleTaskClick = (task: typeof allTasks[0]) => {
    const lead = leads.find(l => l.id === task.lead_id);
    if (lead) setSelectedLead(lead);
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-primary" />
            Tarefas
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.pending} pendentes · {stats.overdue} atrasadas · {stats.today} para hoje
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </Button>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "pending", label: "Pendentes", count: stats.pending },
          { key: "today", label: "Hoje", count: stats.today },
          { key: "overdue", label: "Atrasadas", count: stats.overdue },
          { key: "completed", label: "Concluídas" },
          { key: "all", label: "Todas", count: stats.total },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label} {f.count !== undefined && `(${f.count})`}
          </button>
        ))}
      </div>

      {/* Tasks table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma tarefa encontrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-10"></TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="hidden sm:table-cell">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const status = getTaskStatusIndicator(task);
                return (
                  <TableRow
                    key={task.id}
                    className={`border-border cursor-pointer hover:bg-muted/50 ${task.completed ? "opacity-50" : ""}`}
                  >
                    <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            {task.completed ? (
                              <Checkbox checked disabled className="border-muted-foreground" />
                            ) : (
                              <div className="relative">
                                <Circle className={`w-5 h-5 ${status.color} cursor-pointer hover:scale-110 transition-transform`}
                                  onClick={() => completeTask.mutate(task)} />
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{task.completed ? "Concluída" : "Marcar como concluída"}</p></TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell onClick={() => handleTaskClick(task)}>
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                      {task.is_cadence && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block">Cadência</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => handleTaskClick(task)}>
                      <span className="text-sm text-primary flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.leads?.nome || "—"}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => handleTaskClick(task)}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">{new Date(task.due_date).toLocaleDateString("pt-BR")}</span>
                        {task.due_time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {task.due_time}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={() => handleTaskClick(task)}>
                      <span className="text-xs text-muted-foreground">{new Date(task.created_at).toLocaleDateString("pt-BR")}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Ligar para cliente" className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label>Anotação / Script (opcional)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detalhes, script de contato..." className="bg-muted border-border min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={newLeadId} onValueChange={setNewLeadId}>
                <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>{lead.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="bg-muted border-border" />
              </div>
              <div className="space-y-2">
                <Label>Hora (opcional)</Label>
                <Input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="bg-muted border-border" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || !newLeadId} className="bg-gradient-primary hover:opacity-90">Criar tarefa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Drawer - opens when clicking a task */}
      <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
    </>
  );
};

export default TarefasPage;
