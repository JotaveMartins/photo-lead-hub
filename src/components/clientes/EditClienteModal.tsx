import { useState, useEffect } from "react";
import { formatPhone, formatCpfCnpj } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCliente, type Cliente } from "@/hooks/useClientes";

const origemOptions = ["Instagram", "Google", "Indicação", "Facebook", "TikTok", "Site", "Outro"];

interface EditClienteModalProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

const EditClienteModal = ({ open, onClose, cliente }: EditClienteModalProps) => {
  const updateCliente = useUpdateCliente();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome);
      setWhatsapp(cliente.whatsapp || "");
      setEmail(cliente.email || "");
      setCpfCnpj(cliente.cpf_cnpj || "");
      setEndereco(cliente.endereco || "");
      setOrigem(cliente.origem || "");
      setObservacoes(cliente.observacoes || "");
    }
  }, [cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !nome.trim()) return;

    await updateCliente.mutateAsync({
      id: cliente.id,
      nome: nome.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      endereco: endereco.trim() || null,
      origem: origem || null,
      observacoes: observacoes.trim() || null,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
            </div>
            <div>
              <Label>Origem</Label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione...</option>
                {origemOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateCliente.isPending}>
              {updateCliente.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClienteModal;
