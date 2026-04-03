import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TimePickerField from "@/components/TimePickerField";
import { Label } from "@/components/ui/label";
import { useEvents, useCreateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useClientes } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AgendaPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [hora, setHora] = useState("10:00");
  const [modalDate, setModalDate] = useState<Date | undefined>(undefined);
  const [clienteSearch, setClienteSearch] = useState("");

  const { data: events = [] } = useEvents();
  const { data: clientes = [] } = useClientes();
  const { data: services = [] } = useServices();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const eventsForDate = events.filter((event) =>
    selectedDate && isSameDay(new Date(event.data_evento), selectedDate)
  );

  const filteredClientes = clientes.filter((c) =>
    !clienteSearch || c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.whatsapp?.includes(clienteSearch)
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
      data_evento: eventDate.toISOString(),
      local: local.trim() || null,
      cliente_id: selectedClienteId || null,
      service_id: selectedServiceId || null,
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitulo("");
    setLocal("");
    setSelectedClienteId("");
    setSelectedServiceId("");
    setClienteSearch("");
  };

  const eventDates = events.map((e) => new Date(e.data_evento));

  // Auto-fill title when service is selected
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (serviceId && !titulo.trim()) {
      const service = services.find((s) => s.id === serviceId);
      if (service) setTitulo(service.nome);
    }
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus eventos e sessões com clientes
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
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 text-primary font-semibold" }}
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
            {eventsForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento nesta data
              </p>
            ) : (
              eventsForDate.map((event) => (
                <div key={event.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{event.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.data_evento), "HH:mm")}
                        {event.tipo && event.tipo !== "Evento" && ` • ${event.tipo}`}
                      </p>
                      {(event as any).local && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {(event as any).local}
                        </p>
                      )}
                      {(event as any).clientes && (
                        <p className="text-xs text-primary mt-1">
                          Cliente: {((event as any).clientes as { nome: string }).nome}
                        </p>
                      )}
                      {(event as any).services && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Serviço: {((event as any).services as { nome: string }).nome}
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsModalOpen(v); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Casamento João & Maria"
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    if (!e.target.value) setSelectedClienteId("");
                  }}
                  placeholder="Buscar cliente..."
                  className="bg-muted border-border pl-8"
                />
              </div>
              {clienteSearch && !selectedClienteId && filteredClientes.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted">
                  {filteredClientes.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClienteId(c.id);
                        setClienteSearch(c.nome);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between"
                    >
                      <span>{c.nome}</span>
                      {c.whatsapp && <span className="text-xs text-muted-foreground">{c.whatsapp}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedClienteId && (
                <button
                  type="button"
                  onClick={() => { setSelectedClienteId(""); setClienteSearch(""); }}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Serviço</Label>
              <select
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Selecione um serviço</option>
                {services.filter(s => s.ativo).map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
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
                <Label>Hora</Label>
                <TimePickerField value={hora} onChange={setHora} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Igreja São José, Buffet..."
                className="bg-muted border-border"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => { resetForm(); setIsModalOpen(false); }}>Cancelar</Button>
              <Button onClick={handleCreateEvent} className="bg-gradient-primary hover:opacity-90">Criar evento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaPage;
