import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateService, useUpdateService, type Service } from "@/hooks/useServices";

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onCreated?: (service: Service) => void;
}


const ServiceModal = ({ open, onOpenChange, service, onCreated }: ServiceModalProps) => {
  const [nome, setNome] = useState("");
  const [valorBase, setValorBase] = useState("");
  const [custoInterno, setCustoInterno] = useState("");

  const createService = useCreateService();
  const updateService = useUpdateService();

  useEffect(() => {
    if (service) {
      setNome(service.nome);
      setValorBase(service.valor_base.toString());
      setCustoInterno(service.custo_interno?.toString() || "");
    } else {
      setNome("");
      setValorBase("");
      setCustoInterno("");
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const data = {
      nome,
      categoria: "",
      valor_base: parseFloat(valorBase) || 0,
      custo_interno: custoInterno ? parseFloat(custoInterno) : null,
      ativo: true,
    };

    if (service) {
      await updateService.mutateAsync({ id: service.id, ...data });
    } else {
      const created = await createService.mutateAsync(data);
      if (created && onCreated) onCreated(created as Service);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {service ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do serviço *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pré-wedding, Ensaio gestante..."
              className="bg-muted border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={valorBase}
              onChange={(e) => setValorBase(e.target.value)}
              placeholder="0,00"
              className="bg-muted border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Custo de execução (R$) <span className="text-muted-foreground text-xs">opcional</span></Label>
            <Input
              type="number"
              step="0.01"
              value={custoInterno}
              onChange={(e) => setCustoInterno(e.target.value)}
              placeholder="Opcional"
              className="bg-muted border-border"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {service ? "Salvar" : "Criar serviço"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceModal;
