import { useState } from "react";
import { Plus, Wrench, Search, Pencil, Trash2, MoreHorizontal, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServices, useDeleteService, useDeletedServices, useRestoreService, usePermanentDeleteService, type Service } from "@/hooks/useServices";
import ServiceModal from "@/components/ServiceModal";
import GenericTrashBin from "@/components/GenericTrashBin";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ServicosPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: services = [], isLoading } = useServices();
  const { data: deletedServices = [] } = useDeletedServices();
  const deleteService = useDeleteService();
  const restoreService = useRestoreService();
  const permanentDeleteService = usePermanentDeleteService();

  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nome.toLowerCase().includes(q) ||
      s.categoria?.toLowerCase().includes(q) ||
      s.descricao?.toLowerCase().includes(q);
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalServices = services.length;
  const ticketMedio = totalServices > 0
    ? services.reduce((sum, s) => sum + s.valor_base, 0) / totalServices
    : 0;

  const trashItems = deletedServices.map(s => ({
    id: s.id,
    label: s.nome,
    sublabel: formatCurrency(s.valor_base),
    deleted_at: s.deleted_at!,
  }));

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            Serviços
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus serviços e valores</p>
        </div>
        <div className="flex items-center gap-2">
          <GenericTrashBin
            items={trashItems}
            onRestore={(id) => restoreService.mutate(id)}
            onPermanentDelete={(id) => permanentDeleteService.mutate(id)}
            isRestoring={restoreService.isPending}
            entityName="serviço"
          />
          <Button
            onClick={() => { setEditingService(null); setIsModalOpen(true); }}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de serviços</p>
            <p className="text-2xl font-bold text-foreground">{totalServices}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--status-success))]/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[hsl(var(--status-success))]" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ticket médio</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(ticketMedio)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, categoria..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted border-border" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Margem</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {services.length === 0 ? "Nenhum serviço cadastrado." : "Nenhum serviço encontrado."}
                </td></tr>
              ) : filtered.map((service) => {
                const margem = service.custo_interno
                  ? ((service.valor_base - service.custo_interno) / service.valor_base * 100)
                  : null;
                return (
                  <tr
                    key={service.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => { setEditingService(service); setIsModalOpen(true); }}
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{service.nome}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{formatCurrency(service.valor_base)}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{service.custo_interno ? formatCurrency(service.custo_interno) : "—"}</td>
                    <td className="px-4 py-4 text-sm">
                      {margem !== null ? (
                        <span className={margem >= 0 ? "text-[hsl(var(--status-success))]" : "text-destructive"}>
                          {margem.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingService(service); setIsModalOpen(true); }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteService.mutate(service.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filtered.length} de {services.length} serviços
        </div>
      </div>

      <ServiceModal open={isModalOpen} onOpenChange={setIsModalOpen} service={editingService} />
    </>
  );
};

export default ServicosPage;
