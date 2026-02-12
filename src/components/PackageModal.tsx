import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { usePackages, useCreatePackage } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { usePackageServicesForPackage, useAddServiceToPackage, useRemoveServiceFromPackage } from "@/hooks/usePackageServices";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId?: string | null;
}

const PackageModal = ({ open, onOpenChange, packageId }: PackageModalProps) => {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoFinal, setPrecoFinal] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: packages = [] } = usePackages();
  const { data: services = [] } = useServices();
  const { data: packageServices = [] } = usePackageServicesForPackage(packageId || undefined);
  const addServiceToPackage = useAddServiceToPackage();
  const removeServiceFromPackage = useRemoveServiceFromPackage();

  const pkg = packages.find((p) => p.id === packageId);
  const isEditing = !!packageId;

  useEffect(() => {
    if (isEditing && pkg) {
      setNome(pkg.nome);
      setDescricao((pkg as any).descricao || "");
      setCategoria((pkg as any).categoria || "");
      setPrecoFinal((pkg as any).preco_final?.toString() || "");
      setSelectedServiceIds(packageServices.map((ps) => ps.service_id));
    } else {
      setNome(""); setDescricao(""); setCategoria(""); setPrecoFinal(""); setSelectedServiceIds([]);
    }
  }, [pkg, packageServices, open]);

  const totalOriginal = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.valor_base, 0);
  }, [selectedServiceIds, services]);

  const economia = useMemo(() => {
    const final = parseFloat(precoFinal) || 0;
    if (totalOriginal > 0 && final > 0 && final < totalOriginal) {
      return ((1 - final / totalOriginal) * 100).toFixed(0);
    }
    return null;
  }, [precoFinal, totalOriginal]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let pkgId = packageId;

      if (isEditing && pkgId) {
        await supabase
          .from("packages")
          .update({ nome, descricao: descricao || null, categoria: categoria || null, preco_final: precoFinal ? parseFloat(precoFinal) : null })
          .eq("id", pkgId);
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert({ nome, user_id: user.id, is_default: false, descricao: descricao || null, categoria: categoria || null, preco_final: precoFinal ? parseFloat(precoFinal) : null })
          .select()
          .single();
        if (error) throw error;
        pkgId = data.id;
      }

      // Sync services
      if (pkgId) {
        const currentIds = packageServices.map((ps) => ps.service_id);
        const toAdd = selectedServiceIds.filter((id) => !currentIds.includes(id));
        const toRemove = packageServices.filter((ps) => !selectedServiceIds.includes(ps.service_id));

        for (const serviceId of toAdd) {
          await addServiceToPackage.mutateAsync({ package_id: pkgId, service_id: serviceId });
        }
        for (const ps of toRemove) {
          await removeServiceFromPackage.mutateAsync({ id: ps.id, package_id: pkgId });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(isEditing ? "Pacote atualizado!" : "Pacote criado!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const activeServices = services.filter((s) => s.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{isEditing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do pacote" className="bg-muted border-border" required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Casamento" className="bg-muted border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do pacote..." className="bg-muted border-border" />
          </div>

          <div className="space-y-2">
            <Label>Serviços inclusos</Label>
            <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {activeServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço ativo cadastrado.</p>
              ) : activeServices.map((service) => (
                <label key={service.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{service.nome}</span>
                    <span className="text-xs text-muted-foreground ml-2">{service.categoria}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatCurrency(service.valor_base)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor total dos serviços</Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-md border border-border text-sm text-muted-foreground">
                {formatCurrency(totalOriginal)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preço final do pacote (R$)</Label>
              <Input type="number" step="0.01" value={precoFinal} onChange={(e) => setPrecoFinal(e.target.value)} placeholder="0,00" className="bg-muted border-border" />
            </div>
          </div>

          {economia && (
            <div className="bg-[hsl(var(--status-success))]/10 border border-[hsl(var(--status-success))]/20 rounded-lg p-3 text-center">
              <span className="text-sm font-medium text-[hsl(var(--status-success))]">
                💰 Economia de {economia}% para o cliente
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">{isEditing ? "Salvar" : "Criar pacote"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageModal;
