import { useState, useMemo } from "react";
import DatePickerField from "@/components/DatePickerField";

import TimePickerField from "@/components/TimePickerField";
import { CheckSquare, Plus, Calendar as CalendarIcon, Clock, User, Circle, Phone, List } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LeadDetailDrawer from "@/components/LeadDetailDrawer";
import { useAllTasks, useCompleteLeadTask, useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { isBefore, isToday, isThisWeek, startOfDay, isSameDay } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, cn, normalizeText } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

type FilterKey = "todo" | "overdue" | "today" | "this_week" | "future" | "completed";

const TarefasPage = () => {
  const { data: allTasks = [] } = useAllTasks();
  const { data: leads = [] } = useLeads();
  const { data: clientes = [] } = useClientes();
  const completeTask = useCompleteLeadTask();
  const createTask = useCreateLeadTask();

  const [filter, setFilter] = useState<FilterKey>("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newDueTime, setNewDueTime] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newClienteId, setNewClienteId] = useState("");
  const [newTargetType, setNewTargetType] = useState<"lead" | "cliente">("lead");
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
      const q = normalizeText(searchQuery);
      tasks = tasks.filter(t =>
        normalizeText(t.title).includes(q) ||
        normalizeText(t.leads?.nome).includes(q)
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
    if (!newTitle.trim()) return;
    if (newTargetType === "lead" && !newLeadId) return;
    if (newTargetType === "cliente" && !newClienteId) return;
    await createTask.mutateAsync({
      lead_id: newTargetType === "lead" ? newLeadId : null,
      cliente_id: newTargetType === "cliente" ? newClienteId : null,
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
    setNewClienteId("");
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-2 transition-colors", viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn("p-2 transition-colors", viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow">
            <Plus className="w-4 h-4" /> Atividade
          </Button>
        </div>
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

        <SearchInput
          containerClassName="ml-auto w-48"
          placeholder="Buscar..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="h-8 bg-muted border-border text-sm"
        />
      </div>

      {viewMode === "table" ? (
        /* Table */
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
      ) : (
        /* Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={setCalendarDate}
                locale={ptBR}
                className="w-full"
                modifiers={{
                  hasTask: allTasks.filter(t => !t.completed).map(t => parseLocalDate(t.due_date)),
                }}
                modifiersClassNames={{
                  hasTask: "bg-primary/20 text-primary font-semibold",
                }}
              />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">
              {calendarDate
                ? format(calendarDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </h3>
            <div className="space-y-2">
              {allTasks
                .filter(t => calendarDate && isSameDay(parseLocalDate(t.due_date), calendarDate))
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      task.completed
                        ? "bg-muted/30 border-border/50 opacity-60"
                        : isBefore(parseLocalDate(task.due_date), today)
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-primary/5 border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {!task.completed ? (
                        <Circle
                          className="w-4 h-4 text-muted-foreground/50 cursor-pointer hover:text-primary flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); completeTask.mutate(task); }}
                        />
                      ) : (
                        <Checkbox checked disabled className="border-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                        {task.leads?.nome && (
                          <p className="text-xs text-muted-foreground mt-0.5">Lead: {task.leads.nome}</p>
                        )}
                        {task.due_time && (
                          <p className="text-xs text-muted-foreground">{task.due_time}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {calendarDate && allTasks.filter(t => isSameDay(parseLocalDate(t.due_date), calendarDate)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade nesta data</p>
              )}
            </div>
          </div>
        </div>
      )}

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
              <Label>Vincular a</Label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setNewTargetType("lead")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${newTargetType === "lead" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground"}`}>
                  Lead
                </button>
                <button type="button" onClick={() => setNewTargetType("cliente")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${newTargetType === "cliente" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground"}`}>
                  Cliente
                </button>
              </div>
              {newTargetType === "lead" ? (
                <select value={newLeadId} onChange={(e) => setNewLeadId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <option value="">Selecione um lead</option>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.nome}</option>)}
                </select>
              ) : (
                <select value={newClienteId} onChange={(e) => setNewClienteId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
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
              <Button onClick={handleCreate} disabled={!newTitle.trim() || (newTargetType === "lead" ? !newLeadId : !newClienteId)} className="bg-gradient-primary hover:opacity-90">Criar atividade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
    </>
  );
};

export default TarefasPage;
