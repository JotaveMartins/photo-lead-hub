import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePackages } from "@/hooks/usePackages";
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
  onCreated?: (pkg: { id: string; nome: string; preco_final: number | null }) => void;
}

const PackageModal = ({ open, onOpenChange, packageId, onCreated }: PackageModalProps) => {
  const [nome, setNome] = useState("");
  const [precoFinal, setPrecoFinal] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const initialized = useRef(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: packages = [] } = usePackages();
  const { data: services = [] } = useServices();
  const { data: packageServices = [] } = usePackageServicesForPackage(packageId || undefined);
  const addServiceToPackage = useAddServiceToPackage();
  const removeServiceFromPackage = useRemoveServiceFromPackage();

  const pkg = packages.find((p) => p.id === packageId);
  const isEditing = !!packageId;

  // Only initialize once when modal opens
  useEffect(() => {
    if (!open) {
      initialized.current = false;
      return;
    }
    if (initialized.current) return;

    if (isEditing && pkg && packageServices.length >= 0) {
      setNome(pkg.nome);
      setPrecoFinal(pkg.preco_final?.toString() || "");
      setSelectedServiceIds(packageServices.map((ps) => ps.service_id));
      initialized.current = true;
    } else if (!isEditing) {
      setNome("");
      setPrecoFinal("");
      setSelectedServiceIds([]);
      initialized.current = true;
    }
  }, [open, pkg, packageServices, isEditing]);

  const totalOriginal = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.valor_base, 0);
  }, [selectedServiceIds, services]);

  const totalCusto = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + (s.custo_interno || 0), 0);
  }, [selectedServiceIds, services]);

  const precoFinalNum = parseFloat(precoFinal) || 0;

  const lucroEstimado = precoFinalNum > 0 ? precoFinalNum - totalCusto : totalOriginal - totalCusto;
  const margemLucro = precoFinalNum > 0 && precoFinalNum > 0
    ? ((lucroEstimado / precoFinalNum) * 100).toFixed(0)
    : totalOriginal > 0
    ? (((totalOriginal - totalCusto) / totalOriginal) * 100).toFixed(0)
    : null;

  const descontoPercent = useMemo(() => {
    if (totalOriginal > 0 && precoFinalNum > 0 && precoFinalNum < totalOriginal) {
      return ((1 - precoFinalNum / totalOriginal) * 100).toFixed(0);
    }
    return null;
  }, [precoFinalNum, totalOriginal]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    try {
      let pkgId = packageId;

      if (isEditing && pkgId) {
        await supabase
          .from("packages")
          .update({ nome, preco_final: precoFinal ? parseFloat(precoFinal) : null })
          .eq("id", pkgId);
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert({ nome, user_id: user.id, is_default: false, preco_final: precoFinal ? parseFloat(precoFinal) : null })
          .select()
          .single();
        if (error) throw error;
        pkgId = data.id;
      }

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
      if (!isEditing && pkgId && onCreated) {
        onCreated({ id: pkgId, nome, preco_final: precoFinal ? parseFloat(precoFinal) : null });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{isEditing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do pacote *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pacote Casamento Completo" className="bg-muted border-border" required />
          </div>

          <div className="space-y-2">
            <Label>Selecione os serviços</Label>
            <div className="border border-border rounded-lg max-h-56 overflow-y-auto">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhum serviço cadastrado. Cadastre serviços primeiro.</p>
              ) : services.map((service) => (
                <label
                  key={service.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-b-0 ${
                    selectedServiceIds.includes(service.id) ? "bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <span className="flex-1 text-sm font-medium text-foreground">{service.nome}</span>
                  <span className="text-sm text-muted-foreground">{formatCurrency(service.valor_base)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Resumo financeiro — sempre visível */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {selectedServiceIds.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Soma dos serviços ({selectedServiceIds.length} itens)</span>
                <span className="font-medium text-foreground">{formatCurrency(totalOriginal)}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Preço final do pacote (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={precoFinal}
                onChange={(e) => setPrecoFinal(e.target.value)}
                placeholder="0,00"
                className="bg-card border-border"
                required
              />
            </div>

            {descontoPercent && (
              <div className="bg-[hsl(var(--status-success))]/10 border border-[hsl(var(--status-success))]/20 rounded-lg p-2.5 text-center">
                <span className="text-sm font-medium text-[hsl(var(--status-success))]">
                  💰 Desconto de {descontoPercent}% — economia de {formatCurrency(totalOriginal - precoFinalNum)}
                </span>
              </div>
            )}

            {selectedServiceIds.length > 0 && totalCusto > 0 && precoFinalNum > 0 && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Custo total de execução</span>
                <span className="text-muted-foreground">{formatCurrency(totalCusto)}</span>
              </div>
            )}

            {selectedServiceIds.length > 0 && totalCusto > 0 && precoFinalNum > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Lucro estimado</span>
                <span className={`font-bold ${lucroEstimado >= 0 ? "text-[hsl(var(--status-success))]" : "text-destructive"}`}>
                  {formatCurrency(lucroEstimado)} ({margemLucro}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {isEditing ? "Salvar" : "Criar pacote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageModal;
