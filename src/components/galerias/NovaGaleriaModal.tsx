import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import SearchSelect from "@/components/SearchSelect";
import DatePickerField from "@/components/DatePickerField";
import { useClientes } from "@/hooks/useClientes";
import { useLeads } from "@/hooks/useLeads";
import { useCreateGallery } from "@/hooks/useGalleries";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NovaGaleriaModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientes();
  const { data: leads = [] } = useLeads();
  const createGallery = useCreateGallery();

  const [name, setName] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("0");
  const [downloadEnabled, setDownloadEnabled] = useState(true);

  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome?.toLowerCase();

  const leadOptions = useMemo(
    () =>
      (leads as any[])
        .filter((l) => (clienteNome ? String(l.nome).toLowerCase() === clienteNome : true))
        .map((l) => ({ value: l.id, label: l.nome, hint: l.whatsapp })),
    [leads, clienteNome],
  );

  const reset = () => {
    setName("");
    setClienteId("");
    setLeadId("");
    setEventDate("");
    setPassword("");
    setExpiresInDays("0");
    setDownloadEnabled(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Informe o nome da galeria");
    if (password && password.length < 4) return toast.error("A senha precisa ter ao menos 4 caracteres");

    const gallery = await createGallery.mutateAsync({
      name,
      cliente_id: clienteId || null,
      lead_id: leadId || null,
      event_date: eventDate || null,
      password: password || null,
      expires_in_days: Number(expiresInDays) || 0,
      download_enabled: downloadEnabled,
    });
    reset();
    onClose();
    navigate(`/galerias/${gallery.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova galeria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da galeria *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Casamento Ana e João" />
          </div>

          <ClienteSearchSelect
            clientes={clientes as any}
            value={clienteId}
            onChange={(id) => {
              setClienteId(id);
              setLeadId("");
            }}
          />

          <SearchSelect
            label="Oportunidade (opcional)"
            options={leadOptions}
            value={leadId}
            onChange={setLeadId}
            placeholder="Vincular a um lead"
            searchPlaceholder="Buscar por nome ou telefone..."
            emptyLabel="Sem vínculo"
          />

          <div>
            <Label>Data do trabalho</Label>
            <DatePickerField value={eventDate} onChange={setEventDate} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Senha de acesso</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Opcional (mín. 4)"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label>Expira em (dias)</Label>
              <Input
                type="number"
                min={0}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">0 = nunca expira</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Permitir download</p>
              <p className="text-xs text-muted-foreground">Tipo: Entrega de Fotos</p>
            </div>
            <Switch checked={downloadEnabled} onCheckedChange={setDownloadEnabled} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createGallery.isPending}>
            {createGallery.isPending ? "Criando..." : "Criar galeria"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovaGaleriaModal;
