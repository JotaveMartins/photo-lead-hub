import { useState, useMemo, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, MapPin, List, ArrowUpDown } from "lucide-react";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import TimePickerField from "@/components/TimePickerField";
import { Label } from "@/components/ui/label";
import GenericTrashBin from "@/components/GenericTrashBin";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useDeletedEvents, useRestoreEvent, usePermanentDeleteEvent } from "@/hooks/useEvents";
import { useClientes } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import { format, isSameDay, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn, normalizeText } from "@/lib/utils";

type FilterKey = "todos" | "proximos" | "passados";
type SortDir = "asc" | "desc";

const AgendaPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [hora, setHora] = useState("10:00");
  const [modalDate, setModalDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filter, setFilter] = useState<FilterKey>("proximos");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: events = [] } = useEvents();
  const { data: deletedEvents = [] } = useDeletedEvents();
  const { data: clientes = [] } = useClientes();
  const { data: services = [] } = useServices();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const restoreEvent = useRestoreEvent();
  const permanentDeleteEvent = usePermanentDeleteEvent();

  const today = startOfDay(new Date());

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (filter === "proximos") {
      filtered = filtered.filter(e => !isBefore(new Date(e.data_evento), today));
    } else if (filter === "passados") {
      filtered = filtered.filter(e => isBefore(new Date(e.data_evento), today));
    }

    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      filtered = filtered.filter(e =>
        normalizeText(e.titulo).includes(q) ||
        normalizeText((e as any).clientes?.nome).includes(q) ||
        normalizeText((e as any).services?.nome).includes(q) ||
        normalizeText((e as any).local).includes(q) ||
        format(new Date(e.data_evento), "dd/MM/yyyy").includes(q)
      );
    }

    filtered.sort((a, b) => {
      const diff = new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime();
      return sortDir === "asc" ? diff : -diff;
    });

    return filtered;
  }, [events, filter, searchQuery, sortDir, today]);

  const eventsForDate = events.filter((event) =>
    selectedDate && isSameDay(new Date(event.data_evento), selectedDate)
  );

  const openModal = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setTitulo(event.titulo);
      setLocal((event as any).local || "");
      setSelectedClienteId(event.cliente_id || "");
      setSelectedServiceId(event.service_id || "");
      const eventDate = new Date(event.data_evento);
      setModalDate(eventDate);
      setHora(format(eventDate, "HH:mm"));
    } else {
      setEditingEvent(null);
      setModalDate(selectedDate);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
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

    const payload = {
      titulo: titulo.trim(),
      data_evento: eventDate.toISOString(),
      local: local.trim() || null,
      cliente_id: selectedClienteId || null,
      service_id: selectedServiceId || null,
    };

    if (editingEvent) {
      await updateEvent.mutateAsync({ id: editingEvent.id, ...payload });
    } else {
      await createEvent.mutateAsync(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitulo("");
    setLocal("");
    setSelectedClienteId("");
    setSelectedServiceId("");
    setEditingEvent(null);
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (serviceId && !titulo.trim()) {
      const service = services.find((s) => s.id === serviceId);
      if (service) setTitulo(service.nome);
    }
  };

  const eventDates = events.map((e) => new Date(e.data_evento));

  const getEventStatus = (dataEvento: string) => {
    const eventDate = startOfDay(new Date(dataEvento));
    if (isBefore(eventDate, today)) return { label: "Realizado", className: "bg-muted text-muted-foreground" };
    if (isSameDay(eventDate, today)) return { label: "Hoje", className: "bg-primary/20 text-primary" };
    return { label: "Agendado", className: "bg-accent text-accent-foreground" };
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "proximos", label: "Próximos" },
    { key: "passados", label: "Passados" },
    { key: "todos", label: "Todos" },
  ];

  const trashItems = deletedEvents.map(e => ({
    id: e.id,
    label: e.titulo,
    sublabel: format(new Date(e.data_evento), "dd/MM/yyyy HH:mm"),
    deleted_at: (e as any).deleted_at,
  }));

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground mt-1">
            {events.length} eventos · {filteredEvents.length} exibidos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GenericTrashBin
            items={trashItems}
            onRestore={(id) => restoreEvent.mutate(id)}
            onPermanentDelete={(id) => permanentDeleteEvent.mutate(id)}
            isRestoring={restoreEvent.isPending}
            entityName="evento"
          />
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
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
          <Button
            onClick={() => openModal()}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
        </div>
      </header>

      {viewMode === "list" ? (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
            <SearchInput
              containerClassName="ml-auto w-64"
              placeholder="Buscar por evento, cliente, local, data..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-8 bg-muted border-border text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="font-medium">Evento</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Serviço</TableHead>
                    <TableHead className="font-medium">Local</TableHead>
                    <TableHead
                      className="font-medium cursor-pointer select-none"
                      onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                    >
                      <span className="flex items-center gap-1">
                        Data
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                    </TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const status = getEventStatus(event.data_evento);
                    return (
                      <TableRow
                        key={event.id}
                        className="border-border hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => openModal(event)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{event.titulo}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {(event as any).clientes?.nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {(event as any).services?.nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(event as any).local ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(event as any).local}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{format(new Date(event.data_evento), "dd/MM/yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(event.data_evento), "HH:mm")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", status.className)}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openModal(event)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEvent.mutate(event.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Calendar + Day detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-muted/50 border border-border/50 group cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => openModal(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{event.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.data_evento), "HH:mm")}
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
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openModal(event)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteEvent.mutate(event.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full event list below */}
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
            <SearchInput
              containerClassName="ml-auto w-64"
              placeholder="Buscar por evento, cliente, local, data..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-8 bg-muted border-border text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="font-medium">Evento</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Serviço</TableHead>
                    <TableHead className="font-medium">Local</TableHead>
                    <TableHead
                      className="font-medium cursor-pointer select-none"
                      onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                    >
                      <span className="flex items-center gap-1">
                        Data
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                    </TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const status = getEventStatus(event.data_evento);
                    return (
                      <TableRow
                        key={event.id}
                        className="border-border hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => openModal(event)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{event.titulo}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {(event as any).clientes?.nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {(event as any).services?.nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(event as any).local ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(event as any).local}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{format(new Date(event.data_evento), "dd/MM/yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(event.data_evento), "HH:mm")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", status.className)}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openModal(event)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEvent.mutate(event.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Event Modal (Create/Edit) */}
      <Dialog open={isModalOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsModalOpen(v); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
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

            <ClienteSearchSelect
              clientes={clientes}
              value={selectedClienteId}
              onChange={setSelectedClienteId}
            />

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
              <Button onClick={handleSaveEvent} className="bg-gradient-primary hover:opacity-90">
                {editingEvent ? "Salvar" : "Criar evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaPage;
