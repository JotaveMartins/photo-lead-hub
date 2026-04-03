import { useState } from "react";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import NovaCobrancaModal from "@/components/financeiro/NovaCobrancaModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import TimePickerField from "@/components/TimePickerField";
import { Receipt, CreditCard, ArrowDownUp, CalendarIcon } from "lucide-react";
import { useCreateEvent } from "@/hooks/useEvents";
import { useServices } from "@/hooks/useServices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type CobrancaType = "unica" | "parcelas" | "entrada_parcelas";

interface LeadToClienteFlowProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const LeadToClienteFlow = ({ lead, open, onClose }: LeadToClienteFlowProps) => {
  const [step, setStep] = useState<"cliente" | "tipo" | "cobranca" | "evento">("cliente");
  const [createdClienteId, setCreatedClienteId] = useState<string | null>(null);
  const [cobrancaType, setCobrancaType] = useState<CobrancaType>("unica");

  // Event form state
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [eventoLocal, setEventoLocal] = useState("");
  const [eventoHora, setEventoHora] = useState("10:00");
  const [eventoDate, setEventoDate] = useState<Date | undefined>(undefined);
  const [eventoServiceId, setEventoServiceId] = useState("");

  const createEvent = useCreateEvent();
  const { data: services = [] } = useServices();

  const handleClienteCreated = (clienteId: string) => {
    setCreatedClienteId(clienteId);
    setStep("tipo");
  };

  const handleSelectType = (type: CobrancaType) => {
    setCobrancaType(type);
    setStep("cobranca");
  };

  const handleCobrancaClose = () => {
    // After cobrança, go to event step
    if (lead?.data_evento) {
      setEventoDate(parseLocalDate(lead.data_evento));
    }
    if (lead?.interesse) {
      setEventoTitulo(lead.interesse);
    }
    setStep("evento");
  };

  const handleCreateEvento = async () => {
    if (!eventoDate) return;

    const [hours, minutes] = eventoHora.split(":").map(Number);
    const eventDate = new Date(eventoDate);
    eventDate.setHours(hours, minutes, 0, 0);

    await createEvent.mutateAsync({
      titulo: eventoTitulo.trim() || "Evento",
      data_evento: eventDate.toISOString(),
      local: eventoLocal.trim() || null,
      cliente_id: createdClienteId || null,
      service_id: eventoServiceId || null,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep("cliente");
    setCreatedClienteId(null);
    setEventoTitulo("");
    setEventoLocal("");
    setEventoHora("10:00");
    setEventoDate(undefined);
    setEventoServiceId("");
    onClose();
  };

  if (!open || !lead) return null;

  return (
    <>
      {step === "cliente" && (
        <NovoClienteModal
          open={true}
          onClose={handleClose}
          initialData={{
            nome: lead.nome,
            whatsapp: lead.whatsapp,
            origem: lead.origem || "",
          }}
          onClienteCreated={handleClienteCreated}
        />
      )}

      {step === "tipo" && (
        <AlertDialog open={true} onOpenChange={(v) => { if (!v) handleClose(); }}>
          <AlertDialogContent className="bg-card border-border sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Cliente cadastrado! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja criar uma cobrança para este cliente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("unica")}
              >
                <Receipt className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Cobrança Única</span>
                <span className="text-[10px] text-muted-foreground">Pagamento avulso</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("parcelas")}
              >
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Parcelas</span>
                <span className="text-[10px] text-muted-foreground">Dividir em parcelas</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("entrada_parcelas")}
              >
                <ArrowDownUp className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Entrada + Parcelas</span>
                <span className="text-[10px] text-muted-foreground">Entrada + restante parcelado</span>
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                // Skip cobrança, go to event
                if (lead?.data_evento) setEventoDate(parseLocalDate(lead.data_evento));
                if (lead?.interesse) setEventoTitulo(lead.interesse);
                setStep("evento");
              }}>Pular cobrança</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {step === "cobranca" && (
        <NovaCobrancaModal
          open={true}
          onOpenChange={(v) => { if (!v) handleCobrancaClose(); }}
          type={cobrancaType}
          initialClienteId={createdClienteId || undefined}
          initialValor={lead.valor || undefined}
        />
      )}

      {step === "evento" && (
        <AlertDialog open={true} onOpenChange={(v) => { if (!v) handleClose(); }}>
          <AlertDialogContent className="bg-card border-border sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Agendar evento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Crie um evento na agenda para este cliente
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={eventoTitulo}
                  onChange={(e) => setEventoTitulo(e.target.value)}
                  placeholder="Ex: Casamento João & Maria"
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <select
                  value={eventoServiceId}
                  onChange={(e) => {
                    setEventoServiceId(e.target.value);
                    if (e.target.value && !eventoTitulo.trim()) {
                      const svc = services.find(s => s.id === e.target.value);
                      if (svc) setEventoTitulo(svc.nome);
                    }
                  }}
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
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-muted border-border",
                          !eventoDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventoDate ? format(eventoDate, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventoDate}
                        onSelect={setEventoDate}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <TimePickerField value={eventoHora} onChange={setEventoHora} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={eventoLocal}
                  onChange={(e) => setEventoLocal(e.target.value)}
                  placeholder="Ex: Igreja, Buffet..."
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Pular</AlertDialogCancel>
              <Button onClick={handleCreateEvento} className="bg-gradient-primary hover:opacity-90">
                Criar evento
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default LeadToClienteFlow;
