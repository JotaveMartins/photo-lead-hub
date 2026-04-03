import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TimePickerField from "@/components/TimePickerField";
import { Label } from "@/components/ui/label";
import { useEvents, useCreateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useLeads } from "@/hooks/useLeads";
import { useAllPendingTasks, useCompleteLeadTask } from "@/hooks/useLeadTasks";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseLocalDate, cn } from "@/lib/utils";

const AgendaPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [local, setLocal] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [hora, setHora] = useState("10:00");
  const [modalDate, setModalDate] = useState<Date | undefined>(undefined);

  const { data: events = [] } = useEvents();
  const { data: leads = [] } = useLeads();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const completeTask = useCompleteLeadTask();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const eventsForDate = events.filter((event) => 
    selectedDate && isSameDay(new Date(event.data_evento), selectedDate)
  );

  const leadsForDate = leads.filter((lead) =>
    lead.data_evento && selectedDate && isSameDay(parseLocalDate(lead.data_evento), selectedDate)
  );

  const tasksForDate = pendingTasks.filter((task) =>
    selectedDate && isSameDay(parseLocalDate(task.due_date), selectedDate)
  );

  const openModal = () => {
    setModalDate(selectedDate);
    setIsModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!titulo.trim()) {
      toast.error("Preencha o título do evento");
      return;
    }
    const eventDateBase = modalDate || selectedDate;
    if (!eventDateBase) {
      toast.error("Selecione uma data");
      return;
    }

    const [hours, minutes] = hora.split(":").map(Number);
    const eventDate = new Date(eventDateBase);
    eventDate.setHours(hours, minutes, 0, 0);

    await createEvent.mutateAsync({
      titulo: titulo.trim(),
      tipo: tipo.trim() || "Evento",
      data_evento: eventDate.toISOString(),
      lead_id: selectedLeadId || null,
      descricao: local.trim() || null,
    });

    setIsModalOpen(false);
    setTitulo("");
    setTipo("");
    setLocal("");
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
          onClick={openModal}
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
                  <div key={event.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{event.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.data_evento), "HH:mm")} • {event.tipo}
                        </p>
                        {event.descricao && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.descricao}
                          </p>
                        )}
                        {event.leads && (
                          <p className="text-xs text-primary mt-1">
                            Lead: {(event.leads as { nome: string }).nome}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteEvent.mutate(event.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Reunião com cliente" className="bg-muted border-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ex: Casamento, Reunião..."
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <TimePickerField value={hora} onChange={setHora} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-muted border-border",
                        !modalDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {modalDate ? format(modalDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={modalDate}
                      onSelect={setModalDate}
                      locale={ptBR}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Ex: Estúdio, Parque..."
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lead (opcional)</Label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Nenhum</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.nome}</option>
                ))}
              </select>
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
