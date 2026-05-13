import { useState, useEffect } from "react";
import { formatPhone, formatCpfCnpj } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCliente, type Cliente } from "@/hooks/useClientes";

const origemOptions = ["Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"];

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
  const [metaAdAccount, setMetaAdAccount] = useState("");
  const [cplBom, setCplBom] = useState<string>("");
  const [cplAlerta, setCplAlerta] = useState<string>("");

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome);
      setWhatsapp(cliente.whatsapp ? formatPhone(cliente.whatsapp) : "");
      setEmail(cliente.email || "");
      setCpfCnpj(cliente.cpf_cnpj ? formatCpfCnpj(cliente.cpf_cnpj) : "");
      setEndereco(cliente.endereco || "");
      setOrigem(cliente.origem || "");
      setObservacoes(cliente.observacoes || "");
      setMetaAdAccount((cliente as any).meta_ad_account_id || "");
      setCplBom((cliente as any).cpl_limite_bom != null ? String((cliente as any).cpl_limite_bom) : "");
      setCplAlerta((cliente as any).cpl_limite_alerta != null ? String((cliente as any).cpl_limite_alerta) : "");
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
      meta_ad_account_id: metaAdAccount.trim() || null,
      cpl_limite_bom: cplBom.trim() ? Number(cplBom.replace(",", ".")) : null,
      cpl_limite_alerta: cplAlerta.trim() ? Number(cplAlerta.replace(",", ".")) : null,
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
              <Input value={whatsapp} onChange={(e) => setWhatsapp(formatPhone(e.target.value))} maxLength={15} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))} maxLength={18} />
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
          <div>
            <Label>Conta Meta Ads (ad_account_id)</Label>
            <Input
              value={metaAdAccount}
              onChange={(e) => setMetaAdAccount(e.target.value)}
              placeholder="act_123456789 ou apenas 123456789"
            />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">CPL — Custo por Lead</p>
              <p className="text-xs text-muted-foreground">Defina dois números. Até o Limite Bom = verde. Entre Bom e Alerta = amarelo. Acima do Alerta = vermelho.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Limite Bom (R$)</Label>
                <Input type="number" step="0.01" min="0" value={cplBom} onChange={(e) => setCplBom(e.target.value)} placeholder="3,50" />
              </div>
              <div>
                <Label className="text-xs">Limite Alerta (R$)</Label>
                <Input type="number" step="0.01" min="0" value={cplAlerta} onChange={(e) => setCplAlerta(e.target.value)} placeholder="4,00" />
              </div>
            </div>
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
