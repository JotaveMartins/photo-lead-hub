import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateService, useUpdateService, useServiceCategories, type Service } from "@/hooks/useServices";

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const ServiceModal = ({ open, onOpenChange, service }: ServiceModalProps) => {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorBase, setValorBase] = useState("");
  const [custoInterno, setCustoInterno] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const categories = useServiceCategories();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const filteredSuggestions = categories.filter(
    (c) => c.toLowerCase().includes(categoria.toLowerCase()) && c.toLowerCase() !== categoria.toLowerCase()
  );

  useEffect(() => {
    if (service) {
      setNome(service.nome);
      setCategoria(service.categoria);
      setDescricao(service.descricao || "");
      setValorBase(service.valor_base.toString());
      setCustoInterno(service.custo_interno?.toString() || "");
      setAtivo(service.ativo);
    } else {
      setNome(""); setCategoria(""); setDescricao(""); setValorBase(""); setCustoInterno(""); setAtivo(true);
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nome,
      categoria,
      descricao: descricao || null,
      valor_base: parseFloat(valorBase) || 0,
      custo_interno: custoInterno ? parseFloat(custoInterno) : null,
      ativo,
    };

    if (service) {
      await updateService.mutateAsync({ id: service.id, ...data });
    } else {
      await createService.mutateAsync(data);
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
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Cobertura Fotográfica" className="bg-muted border-border" required />
          </div>

          <div className="space-y-2 relative">
            <Label>Categoria *</Label>
            <Input
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Ex: Casamento, Debutante, Corporativo..."
              className="bg-muted border-border"
              required
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredSuggestions.map((c) => (
                  <button key={c} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => { setCategoria(c); setShowSuggestions(false); }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do serviço..." className="bg-muted border-border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Base (R$) *</Label>
              <Input type="number" step="0.01" value={valorBase} onChange={(e) => setValorBase(e.target.value)} placeholder="0,00" className="bg-muted border-border" required />
            </div>
            <div className="space-y-2">
              <Label>Custo Interno (R$)</Label>
              <Input type="number" step="0.01" value={custoInterno} onChange={(e) => setCustoInterno(e.target.value)} placeholder="Opcional" className="bg-muted border-border" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>{ativo ? "Ativo" : "Inativo"}</Label>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">{service ? "Salvar" : "Criar serviço"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceModal;
