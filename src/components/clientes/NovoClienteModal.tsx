import { useState, useEffect } from "react";
import { formatPhone, formatCpfCnpj } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCliente } from "@/hooks/useClientes";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

const origemOptions = ["Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro"];

interface NovoClienteModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    nome?: string;
    whatsapp?: string;
    origem?: string;
    email?: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  onClienteCreated?: (clienteId: string) => void;
  lockOutsideClose?: boolean;
  hideCobrancaPrompt?: boolean;
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

const NovoClienteModal = ({ open, onClose, initialData, onClienteCreated, lockOutsideClose, hideCobrancaPrompt, headerExtra, footerExtra }: NovoClienteModalProps) => {
  const effectiveUserId = useEffectiveUserId();
  const createCliente = useCreateCliente();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showCobrancaPrompt, setShowCobrancaPrompt] = useState(false);

  // Pre-fill when initialData changes
  useEffect(() => {
    if (initialData && open) {
      setNome(initialData.nome || "");
      setWhatsapp(initialData.whatsapp || "");
      setOrigem(initialData.origem || "");
      setEmail(initialData.email || "");
      setCpfCnpj(initialData.cpf_cnpj || "");
      setEndereco(initialData.endereco || "");
    }
  }, [initialData, open]);

  const reset = () => {
    setNome("");
    setWhatsapp("");
    setEmail("");
    setCpfCnpj("");
    setEndereco("");
    setOrigem("");
    setObservacoes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId || !nome.trim()) return;

    const result = await createCliente.mutateAsync({
      user_id: effectiveUserId,
      nome: nome.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      endereco: endereco.trim() || null,
      origem: origem || null,
      observacoes: observacoes.trim() || null,
    });

    reset();

    // If there's a callback (lead flow), use it instead of closing/showing the prompt
    if (onClienteCreated && result?.id) {
      onClienteCreated(result.id);
    } else {
      onClose();
      if (!hideCobrancaPrompt) setShowCobrancaPrompt(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v && !lockOutsideClose) onClose(); }}>
        <DialogContent
          className="sm:max-w-md bg-card border-border"
          onPointerDownOutside={(e) => { if (lockOutsideClose) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Cliente</DialogTitle>
            {headerExtra}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} />
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
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas sobre o cliente..." rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {footerExtra}
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={createCliente.isPending}>
                {createCliente.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCobrancaPrompt} onOpenChange={setShowCobrancaPrompt}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cliente cadastrado!</AlertDialogTitle>
            <AlertDialogDescription>Deseja criar uma cobrança para este cliente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/financeiro/cobrancas")}>Sim, criar cobrança</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NovoClienteModal;
