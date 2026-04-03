import { useState, useMemo } from "react";
import DatePickerField from "@/components/DatePickerField";

import TimePickerField from "@/components/TimePickerField";
import { CheckSquare, Plus, Calendar as CalendarIcon, Clock, User, Circle, Search, Phone, List } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LeadDetailDrawer from "@/components/LeadDetailDrawer";
import { useAllTasks, useCompleteLeadTask, useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useLeads } from "@/hooks/useLeads";
import { isBefore, isToday, isThisWeek, startOfDay, isSameDay } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

type FilterKey = "todo" | "overdue" | "today" | "this_week" | "future" | "completed";

const TarefasPage = () => {
  const { data: allTasks = [] } = useAllTasks();
  const { data: leads = [] } = useLeads();
  const completeTask = useCompleteLeadTask();
  const createTask = useCreateLeadTask();

  const [filter, setFilter] = useState<FilterKey>("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newDueTime, setNewDueTime] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const today = startOfDay(new Date());

  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    // Filter by status
    tasks = tasks.filter((task) => {
      const dueDate = parseLocalDate(task.due_date);
      switch (filter) {
        case "todo": return !task.completed;
        case "completed": return task.completed;
        case "overdue": return !task.completed && isBefore(dueDate, today);
        case "today": return !task.completed && isToday(dueDate);
        case "this_week": return !task.completed && isThisWeek(dueDate, { weekStartsOn: 1 });
        case "future": return !task.completed && !isBefore(dueDate, today) && !isToday(dueDate);
        default: return true;
      }
    });

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.leads?.nome?.toLowerCase().includes(q)
      );
    }

    return tasks;
  }, [allTasks, filter, today, searchQuery]);

  const stats = useMemo(() => {
    const pending = allTasks.filter(t => !t.completed);
    const overdue = pending.filter(t => isBefore(parseLocalDate(t.due_date), today));
    const todayTasks = pending.filter(t => isToday(parseLocalDate(t.due_date)));
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

  const getRowStatusClass = (task: typeof allTasks[0]) => {
    if (task.completed) return "opacity-50";
    const dueDate = parseLocalDate(task.due_date);
    if (isBefore(dueDate, today)) return "border-l-2 border-l-red-500";
    if (isToday(dueDate)) return "border-l-2 border-l-green-500";
    return "";
  };

  const handleTaskClick = (task: typeof allTasks[0]) => {
    const lead = leads.find(l => l.id === task.lead_id);
    if (lead) setSelectedLead(lead);
  };

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "todo", label: "Para fazer", count: stats.pending },
    { key: "overdue", label: "Vencido", count: stats.overdue },
    { key: "today", label: "Hoje", count: stats.today },
    { key: "this_week", label: "Esta semana" },
    { key: "future", label: "Futuro" },
    { key: "completed", label: "Concluídas" },
  ];

  return (
    <>
      {/* Header */}
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Atividades</h1>
            <p className="text-sm text-muted-foreground">{stats.total} atividades · {stats.pending} pendentes</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow">
          <Plus className="w-4 h-4" /> Atividade
        </Button>
      </header>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f.label}{f.count !== undefined ? ` (${f.count})` : ""}
          </button>
        ))}

        <div className="ml-auto relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 w-48 bg-muted border-border text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma atividade encontrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/30">
                <TableHead className="w-10 px-3"></TableHead>
                <TableHead className="font-medium">Assunto</TableHead>
                <TableHead className="font-medium">Pessoa de contato</TableHead>
                <TableHead className="font-medium">Telefone</TableHead>
                <TableHead className="font-medium">Data de venc.</TableHead>
                <TableHead className="font-medium hidden md:table-cell">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={`border-border cursor-pointer hover:bg-muted/40 transition-colors ${getRowStatusClass(task)}`}
                >
                  <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center">
                          {task.completed ? (
                            <Checkbox checked disabled className="border-muted-foreground" />
                          ) : (
                            <Circle
                              className="w-5 h-5 text-muted-foreground/50 cursor-pointer hover:text-primary hover:scale-110 transition-all"
                              onClick={() => completeTask.mutate(task)}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{task.completed ? "Concluída" : "Marcar como concluída"}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell onClick={() => handleTaskClick(task)}>
                    <div className="flex items-center gap-2">
                      {task.is_cadence && <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      <div>
                        <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleTaskClick(task)}>
                    <span className="text-sm text-foreground">{task.leads?.nome || "—"}</span>
                  </TableCell>
                  <TableCell onClick={() => handleTaskClick(task)}>
                    <span className="text-sm text-muted-foreground">{task.leads?.whatsapp || "—"}</span>
                  </TableCell>
                  <TableCell onClick={() => handleTaskClick(task)}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{parseLocalDate(task.due_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span>
                      {task.due_time && (
                        <span className="text-xs text-muted-foreground">{task.due_time}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell" onClick={() => handleTaskClick(task)}>
                    <span className="text-xs text-muted-foreground">{new Date(task.created_at).toLocaleDateString("pt-BR")}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
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
              <select
                value={newLeadId}
                onChange={(e) => setNewLeadId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <DatePickerField value={newDueDate} onChange={setNewDueDate} placeholder="Selecione a data" />
              </div>
              <div className="space-y-2">
                <Label>Hora (opcional)</Label>
                <TimePickerField value={newDueTime} onChange={setNewDueTime} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || !newLeadId} className="bg-gradient-primary hover:opacity-90">Criar atividade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
    </>
  );
};

export default TarefasPage;
