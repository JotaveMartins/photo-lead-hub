import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchSelect from "@/components/SearchSelect";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import DatePickerField from "@/components/DatePickerField";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useClientes } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import {
  ENTREGA_ETAPAS,
  useCreateEntrega,
  useUpdateEntrega,
  useDeleteEntrega,
  type Entrega,
  type EntregaEtapa,
} from "@/hooks/useEntregas";

interface Props {
  open: boolean;
  onClose: () => void;
  entrega?: Entrega | null;
  defaultClienteId?: string | null;
}

const EntregaDrawer = ({ open, onClose, entrega, defaultClienteId }: Props) => {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientes();
  const { data: services = [] } = useServices();
  const createEntrega = useCreateEntrega();
  const updateEntrega = useUpdateEntrega();
  const deleteEntrega = useDeleteEntrega();

  const [titulo, setTitulo] = useState("");
  const [etapa, setEtapa] = useState<EntregaEtapa>("Ensaio Agendado");
  const [clienteId, setClienteId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [dataEnsaio, setDataEnsaio] = useState("");
  const [dataPrevia, setDataPrevia] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [link, setLink] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitulo(entrega?.titulo ?? "");
    setEtapa((entrega?.etapa as EntregaEtapa) ?? "Ensaio Agendado");
    setClienteId(entrega?.cliente_id ?? defaultClienteId ?? "");
    setServiceId(entrega?.service_id ?? "");
    setDataEnsaio(entrega?.data_ensaio ?? "");
    setDataPrevia(entrega?.data_previa_prevista ?? "");
    setDataPrevista(entrega?.data_entrega_prevista ?? "");
    setDataFinal(entrega?.data_entrega_final ?? "");
    setLink(entrega?.link_galeria ?? "");
    setObs(entrega?.observacoes ?? "");
  }, [open, entrega, defaultClienteId]);

  const saving = createEntrega.isPending || updateEntrega.isPending;
  const isValid = Boolean(titulo.trim() && etapa && clienteId);

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Preencha Título, Etapa e Cliente");
      return;
    }
    const payload = {
      titulo: titulo.trim(),
      etapa,
      cliente_id: clienteId,
      service_id: serviceId || null,
      data_ensaio: dataEnsaio || null,
      data_previa_prevista: dataPrevia || null,
      data_entrega_prevista: dataPrevista || null,
      data_entrega_final: dataFinal || null,
      link_galeria: link.trim() || null,
      observacoes: obs.trim() || null,
    };
    try {
      if (entrega) {
        await updateEntrega.mutateAsync({ id: entrega.id, ...payload });
        toast.success("Entrega atualizada");
      } else {
        await createEntrega.mutateAsync(payload);
        toast.success("Entrega criada");
      }
      onClose();
    } catch {
      /* erro já tratado no hook */
    }
  };

  const handleDelete = async () => {
    if (!entrega) return;
    await deleteEntrega.mutateAsync(entrega.id);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {entrega ? "Editar entrega" : "Nova entrega"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ensaio Casal Ana & Léo"
              className="bg-muted border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <SearchSelect
                label="Etapa"
                required
                options={ENTREGA_ETAPAS.map((s) => ({ value: s.etapa, label: s.label }))}
                value={etapa}
                onChange={(v) => v && setEtapa(v as EntregaEtapa)}
                allowEmpty={false}
                placeholder="Selecione a etapa"
                searchPlaceholder="Buscar etapa..."
              />
            </div>
            <div className="space-y-2">
              <SearchSelect
                label="Serviço"
                options={services.filter((s: any) => s.ativo).map((s: any) => ({ value: s.id, label: s.nome }))}
                value={serviceId}
                onChange={setServiceId}
                placeholder="Sem serviço"
                emptyLabel="Sem serviço"
                searchPlaceholder="Buscar serviço..."
              />
            </div>
          </div>

          <ClienteSearchSelect
            clientes={clientes as any}
            value={clienteId}
            onChange={setClienteId}
            required
            allowEmpty={false}
            emptyLabel="Selecione o cliente"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data do ensaio</Label>
              <DatePickerField value={dataEnsaio} onChange={setDataEnsaio} placeholder="Data do ensaio" />
            </div>
            <div className="space-y-2">
              <Label>Prévia prevista</Label>
              <DatePickerField value={dataPrevia} onChange={setDataPrevia} placeholder="Prévia prevista" />
            </div>
            <div className="space-y-2">
              <Label>Entrega prevista</Label>
              <DatePickerField value={dataPrevista} onChange={setDataPrevista} placeholder="Entrega prevista" />
            </div>
            <div className="space-y-2">
              <Label>Entrega final</Label>
              <DatePickerField value={dataFinal} onChange={setDataFinal} placeholder="Entrega final" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link da galeria</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="bg-muted border-border" />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} className="bg-muted border-border resize-none" />
          </div>

          {entrega && (
            <div className="flex flex-wrap gap-2 pt-1">
              {entrega.cliente_id && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/clientes/${entrega.cliente_id}`)}>
                  <ExternalLink className="w-3.5 h-3.5" /> Ver cliente
                </Button>
              )}
              {entrega.event_id && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/agenda?open=${entrega.event_id}`)}>
                  <ExternalLink className="w-3.5 h-3.5" /> Ver na agenda
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            {entrega ? (
              <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleDelete} disabled={deleteEntrega.isPending}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button className="bg-gradient-primary hover:opacity-90 gap-2" onClick={handleSave} disabled={saving || !isValid}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EntregaDrawer;