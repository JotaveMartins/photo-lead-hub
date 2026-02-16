import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateUserModal = ({ open, onOpenChange }: CreateUserModalProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createUser } = useAdminUsers();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!nome.trim() || !email.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    try {
      const result = await createUser.mutateAsync({ nome, email });
      setGeneratedPassword(result.password);
      toast({ title: "Cliente criado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setNome("");
    setEmail("");
    setGeneratedPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{generatedPassword ? "Cliente Criado!" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {generatedPassword
              ? "Copie a senha abaixo e envie ao cliente."
              : "Informe o nome e email do cliente."}
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted border">
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium">{email}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border">
              <p className="text-sm text-muted-foreground mb-1">Senha temporária</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-bold text-primary">{generatedPassword}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createUser.isPending}>
                {createUser.isPending ? "Criando..." : "Criar Cliente"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
