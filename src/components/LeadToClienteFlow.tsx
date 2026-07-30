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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import TimePickerField from "@/components/TimePickerField";
import {
  Receipt, CreditCard, ArrowDownUp, Calendar as CalendarIcon, ArrowLeft,
  Check, CheckCircle2, User, DollarSign,
} from "lucide-react";
import SearchSelect from "@/components/SearchSelect";
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

const COBRANCA_LABELS: Record<CobrancaType, string> = {
  unica: "Cobrança Única",
  parcelas: "Parcelada",
  entrada_parcelas: "Entrada + Parcelas",
};

const LeadToClienteFlow = ({ lead, open, onClose }: LeadToClienteFlowProps) => {
  const [step, setStep] = useState<"cliente" | "tipo" | "cobranca" | "evento" | "confirmacao">("cliente");
  const [createdClienteId, setCreatedClienteId] = useState<string | null>(null);
  const [createdClienteNome, setCreatedClienteNome] = useState<string>("");
  const [cobrancaType, setCobrancaType] = useState<CobrancaType>("unica");
  const [cobrancaWasCreated, setCobrancaWasCreated] = useState(false);

  // Event form state
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [eventoLocal, setEventoLocal] = useState("");
  const [eventoHora, setEventoHora] = useState("10:00");
  const [eventoDate, setEventoDate] = useState<Date | undefined>(undefined);
  const [eventoServiceId, setEventoServiceId] = useState("");
  const [eventoWasCreated, setEventoWasCreated] = useState(false);

  const createEvent = useCreateEvent();
  const { data: services = [] } = useServices();
  const createEntrega = useCreateEntrega();

  const handleClienteCreated = (clienteId: string) => {
    setCreatedClienteId(clienteId);
    setCreatedClienteNome(lead?.nome || "");
    setStep("tipo");
  };

  const handleSelectType = (type: CobrancaType) => {
    setCobrancaType(type);
    setStep("cobranca");
  };

  const goToEvento = () => {
    if (lead?.data_evento) setEventoDate(parseLocalDate(lead.data_evento));
    if (lead?.interesse) {
      setEventoTitulo(lead.interesse);
      const matched = services.find(
        (s) => s.ativo && s.nome.toLowerCase().includes((lead.interesse || "").toLowerCase())
      );
      if (matched) setEventoServiceId(matched.id);
    }
    setStep("evento");
  };

  const goToConfirmacao = () => setStep("confirmacao");

  const handleCobrancaClosed = () => {
    setCobrancaWasCreated(true);
    goToEvento();
  };

  const handleCreateEvento = async () => {
    if (!eventoDate) return;
    const [hours, minutes] = eventoHora.split(":").map(Number);
    const eventDate = new Date(eventoDate);
    eventDate.setHours(hours, minutes, 0, 0);

    const novoEvento: any = await createEvent.mutateAsync({
      titulo: eventoTitulo.trim() || "Evento",
      data_evento: eventDate.toISOString(),
      local: eventoLocal.trim() || null,
      cliente_id: createdClienteId || null,
      service_id: eventoServiceId || null,
    });

    // Cria o trabalho no funil de entregas (pós-venda)
    try {
      await createEntrega.mutateAsync({
        titulo: eventoTitulo.trim() || lead?.nome || "Entrega",
        etapa: "Ensaio Agendado",
        cliente_id: createdClienteId || null,
        lead_id: lead?.id || null,
        event_id: novoEvento?.id || null,
        service_id: eventoServiceId || null,
        data_ensaio: format(eventDate, "yyyy-MM-dd"),
      });
    } catch {
      /* erro já exibido pelo hook */
    }

    setEventoWasCreated(true);
    goToConfirmacao();
  };

  const handleClose = () => {
    setStep("cliente");
    setCreatedClienteId(null);
    setCreatedClienteNome("");
    setCobrancaType("unica");
    setCobrancaWasCreated(false);
    setEventoTitulo("");
    setEventoLocal("");
    setEventoHora("10:00");
    setEventoDate(undefined);
    setEventoServiceId("");
    setEventoWasCreated(false);
    onClose();
  };

  if (!open || !lead) return null;

  const steps: { key: typeof step; label: string }[] = [
    { key: "cliente", label: "Cliente" },
    { key: "tipo", label: "Cobrança" },
    { key: "evento", label: "Evento" },
    { key: "confirmacao", label: "Confirmação" },
  ];
  const currentIdx = step === "cobranca" ? 1 : steps.findIndex((s) => s.key === step);
  const totalSteps = steps.length;

  const StepIndicator = (
    <div className="flex items-center gap-1.5 pt-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              i <= currentIdx ? "bg-primary" : "bg-muted"
            )}
          />
          {i === currentIdx && (
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          )}
        </div>
      ))}
      <span className="text-[11px] text-muted-foreground ml-auto">
        Passo {currentIdx + 1} de {totalSteps}
      </span>
    </div>
  );

  return (
    <>
      {step === "cliente" && (
        <NovoClienteModal
          open={true}
          onClose={handleClose}
          initialData={{
            nome: lead.nome,
            whatsapp: lead.whatsapp || "",
            origem: lead.origem || "",
            email: "",
            cpf_cnpj: "",
            endereco: "",
          }}
          onClienteCreated={handleClienteCreated}
          lockOutsideClose
          hideCobrancaPrompt
          headerExtra={StepIndicator}
        />
      )}

      {step === "tipo" && (
        <AlertDialog open={true}>
          <AlertDialogContent className="bg-card border-border sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Cliente cadastrado! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja criar uma cobrança para este cliente?
              </AlertDialogDescription>
              {StepIndicator}
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
            <AlertDialogFooter className="sm:justify-between">
              <Button variant="ghost" size="sm" onClick={goToEvento}>
                Pular cobrança →
              </Button>
              <Button variant="outline" size="sm" onClick={goToConfirmacao}>
                Pular e finalizar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {step === "cobranca" && (
        <NovaCobrancaModal
          open={true}
          onOpenChange={(v) => { if (!v) handleCobrancaClosed(); }}
          type={cobrancaType}
          initialClienteId={createdClienteId || undefined}
          initialValor={lead.valor || undefined}
          lockOutsideClose
          headerExtra={StepIndicator}
          footerExtra={
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("tipo")} className="mr-auto gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
          }
        />
      )}

      {step === "evento" && (
        <AlertDialog open={true}>
          <AlertDialogContent className="bg-card border-border sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Agendar evento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Crie um evento na agenda para este cliente
              </AlertDialogDescription>
              {StepIndicator}
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
                <SearchSelect
                  options={services.filter(s => s.ativo).map(s => ({ value: s.id, label: s.nome }))}
                  value={eventoServiceId}
                  onChange={(id) => {
                    setEventoServiceId(id);
                    if (id && !eventoTitulo.trim()) {
                      const svc = services.find(s => s.id === id);
                      if (svc) setEventoTitulo(svc.nome);
                    }
                  }}
                  placeholder="Selecione um serviço"
                  searchPlaceholder="Buscar serviço..."
                  emptyLabel="Sem serviço"
                />
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

            <AlertDialogFooter className="sm:justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("tipo")} className="gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToConfirmacao}>
                  Pular evento
                </Button>
                <Button onClick={handleCreateEvento} disabled={!eventoDate || createEvent.isPending} className="bg-gradient-primary hover:opacity-90 gap-1">
                  <Check className="w-4 h-4" /> Criar evento
                </Button>
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {step === "confirmacao" && (
        <AlertDialog open={true}>
          <AlertDialogContent className="bg-card border-border sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Tudo certo! Lead convertido 🎉
              </AlertDialogTitle>
              <AlertDialogDescription>
                Confira os dados registrados:
              </AlertDialogDescription>
              {StepIndicator}
            </AlertDialogHeader>

            <div className="py-2 space-y-3">
              {/* Cliente */}
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
                  <p className="text-sm font-medium text-foreground">{createdClienteNome || lead.nome}</p>
                  {lead.whatsapp && <p className="text-xs text-muted-foreground">{lead.whatsapp}</p>}
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-0.5 shrink-0" />
              </div>

              {/* Cobrança */}
              {cobrancaWasCreated && (
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cobrança</p>
                    <p className="text-sm font-medium text-foreground">{COBRANCA_LABELS[cobrancaType]}</p>
                    {lead.valor && (
                      <p className="text-xs text-muted-foreground">
                        {lead.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-0.5 shrink-0" />
                </div>
              )}

              {/* Evento */}
              {eventoWasCreated && (
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evento</p>
                    <p className="text-sm font-medium text-foreground">{eventoTitulo || "Evento"}</p>
                    {eventoDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(eventoDate, "dd/MM/yyyy", { locale: ptBR })} às {eventoHora}
                        {eventoLocal ? ` · ${eventoLocal}` : ""}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-0.5 shrink-0" />
                </div>
              )}

              {!cobrancaWasCreated && !eventoWasCreated && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Cliente cadastrado. Você pode adicionar cobranças e eventos a qualquer momento.
                </p>
              )}
            </div>

            <AlertDialogFooter>
              <Button className="w-full bg-gradient-primary hover:opacity-90 gap-2" onClick={handleClose}>
                <Check className="w-4 h-4" /> Confirmar e Concluir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default LeadToClienteFlow;
