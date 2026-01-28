import { useState } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEvents, useCreateEvent } from "@/hooks/useEvents";
import { useLeads } from "@/hooks/useLeads";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const AgendaPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("evento");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [hora, setHora] = useState("10:00");

  const { data: events = [] } = useEvents();
  const { data: leads = [] } = useLeads();
  const createEvent = useCreateEvent();

  // Get events for selected date
  const eventsForDate = events.filter((event) => 
    selectedDate && isSameDay(new Date(event.data_evento), selectedDate)
  );

  // Also show leads with events on this date
  const leadsForDate = leads.filter((lead) =>
    lead.data_evento && selectedDate && isSameDay(parseISO(lead.data_evento), selectedDate)
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

  // Dates with events (for highlighting on calendar)
  const eventDates = [
    ...events.map((e) => new Date(e.data_evento)),
    ...leads.filter((l) => l.data_evento).map((l) => parseISO(l.data_evento!)),
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
            Gerencie seus eventos e compromissos
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

        {/* Events for selected date */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">
            {selectedDate 
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : "Selecione uma data"}
          </h3>

          <div className="space-y-3">
            {eventsForDate.length === 0 && leadsForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento nesta data
              </p>
            ) : (
              <>
                {eventsForDate.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <p className="font-medium text-sm text-foreground">
                      {event.titulo}
                    </p>
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
                  <div
                    key={lead.id}
                    className="p-3 rounded-lg bg-primary/10 border border-primary/30"
                  >
                    <p className="font-medium text-sm text-foreground">
                      Evento: {lead.nome}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lead.interesse || "Evento do cliente"}
                    </p>
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
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Reunião com cliente"
                className="bg-muted border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lead (opcional)</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateEvent}
                className="bg-gradient-primary hover:opacity-90"
              >
                Criar evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaPage;
