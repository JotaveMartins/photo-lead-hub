import { useState, useMemo } from "react";
import { CheckSquare, Plus, Filter, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllTasks, useCompleteLeadTask, useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useLeads } from "@/hooks/useLeads";
import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const getTaskStatusColor = (task: typeof allTasks[0]) => {
    if (task.completed) return "border-l-muted-foreground";
    const dueDate = parseISO(task.due_date);
    if (isBefore(dueDate, today)) return "border-l-[hsl(var(--status-danger))]";
    if (isToday(dueDate)) return "border-l-[hsl(var(--status-success))]";
    return "border-l-muted-foreground/50";
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

      {/* Tasks list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma tarefa encontrada.</p>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-4 rounded-lg bg-card border border-border border-l-4 ${getTaskStatusColor(task)} ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => !task.completed && completeTask.mutate(task)}
                disabled={task.completed || completeTask.isPending}
                className="border-primary data-[state=checked]:bg-primary"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {task.leads && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.leads.nome}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString("pt-BR")}
                  </span>
                  {task.due_time && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.due_time}
                    </span>
                  )}
                  {task.is_cadence && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Cadência</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                Criada em {new Date(task.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))
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
              <Label>Descrição (opcional)</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detalhes..." className="bg-muted border-border" />
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
    </>
  );
};

export default TarefasPage;
