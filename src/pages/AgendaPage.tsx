import { useState } from "react";
import { Calendar as CalendarIcon, Plus, CheckCircle2, Circle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import TimePickerField from "@/components/TimePickerField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEvents, useCreateEvent } from "@/hooks/useEvents";
import { useLeads } from "@/hooks/useLeads";
import { useAllPendingTasks, useCompleteLeadTask } from "@/hooks/useLeadTasks";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";

const AgendaPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("evento");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [hora, setHora] = useState("10:00");

  const { data: events = [] } = useEvents();
  const { data: leads = [] } = useLeads();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const completeTask = useCompleteLeadTask();
  const createEvent = useCreateEvent();

  const eventsForDate = events.filter((event) => 
    selectedDate && isSameDay(new Date(event.data_evento), selectedDate)
  );

  const leadsForDate = leads.filter((lead) =>
    lead.data_evento && selectedDate && isSameDay(parseLocalDate(lead.data_evento), selectedDate)
  );

  const tasksForDate = pendingTasks.filter((task) =>
    selectedDate && isSameDay(parseLocalDate(task.due_date), selectedDate)
  );

  const handleCreateEvent = async () => {
    if (!titulo.trim()) {
      toast.error("Preencha o título do evento");
      return;
    }
    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    const [hours, minutes] = hora.split(":").map(Number);
    const eventDate = new Date(selectedDate);
    eventDate.setHours(hours, minutes, 0, 0);

    await createEvent.mutateAsync({
      titulo: titulo.trim(),
      tipo,
      data_evento: eventDate.toISOString(),
      lead_id: selectedLeadId || null,
    });

    setIsModalOpen(false);
    setTitulo("");
    setTipo("evento");
    setSelectedLeadId("");
  };

  const eventDates = [
    ...events.map((e) => new Date(e.data_evento)),
    ...leads.filter((l) => l.data_evento).map((l) => parseLocalDate(l.data_evento!)),
    ...pendingTasks.map((t) => parseLocalDate(t.due_date)),
  ];

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus eventos e tarefas de contato
          </p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="w-full"
              modifiers={{
                hasEvent: eventDates,
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 text-primary font-semibold",
              }}
            />
          </div>
        </div>

        {/* Events + Tasks for selected date */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">
            {selectedDate 
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : "Selecione uma data"}
          </h3>

          <div className="space-y-3">
            {/* Cadence Tasks */}
            {tasksForDate.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Tarefas de Contato</p>
                {tasksForDate.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => completeTask.mutate(task)}
                      disabled={completeTask.isPending}
                      className="border-primary data-[state=checked]:bg-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{task.title}</p>
                      {task.leads && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Lead: {task.leads.nome}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {eventsForDate.length === 0 && leadsForDate.length === 0 && tasksForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento ou tarefa nesta data
              </p>
            ) : (
              <>
                {eventsForDate.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="font-medium text-sm text-foreground">{event.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.data_evento), "HH:mm")} • {event.tipo}
                    </p>
                    {event.leads && (
                      <p className="text-xs text-primary mt-1">
                        Lead: {(event.leads as { nome: string }).nome}
                      </p>
                    )}
                  </div>
                ))}

                {leadsForDate.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="font-medium text-sm text-foreground">Evento: {lead.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">{lead.interesse || "Evento do cliente"}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Reunião com cliente" className="bg-muted border-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <TimePickerField value={hora} onChange={setHora} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lead (opcional)</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>{lead.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateEvent} className="bg-gradient-primary hover:opacity-90">Criar evento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaPage;
