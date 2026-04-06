import { useState } from "react";
import { Plus, Package, Search, Pencil, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePackages, useDeletePackage, useDeletedPackages, useRestorePackage, usePermanentDeletePackage } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { usePackageServicesForPackage } from "@/hooks/usePackageServices";
import PackageModal from "@/components/PackageModal";
import GenericTrashBin from "@/components/GenericTrashBin";

const PacotesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: packages = [], isLoading } = usePackages();
  const { data: services = [] } = useServices();
  const { data: deletedPackages = [] } = useDeletedPackages();
  const deletePackage = useDeletePackage();
  const restorePackage = useRestorePackage();
  const permanentDeletePackage = usePermanentDeletePackage();

  const filtered = packages.filter((p) => {
    if (p.is_default) return false;
    const q = searchQuery.toLowerCase();
    return p.nome.toLowerCase().includes(q) ||
      p.descricao?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q);
  });

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "—";

  const totalPacotes = packages.filter(p => !p.is_default).length;
  const ticketMedio = totalPacotes > 0
    ? packages.filter(p => !p.is_default && p.preco_final).reduce((sum, p) => sum + (p.preco_final || 0), 0) / totalPacotes
    : 0;

  const trashItems = deletedPackages.filter(p => !p.is_default).map(p => ({
    id: p.id,
    label: p.nome,
    sublabel: formatCurrency(p.preco_final),
    deleted_at: (p as any).deleted_at,
  }));

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Pacotes
          </h1>
          <p className="text-muted-foreground mt-1">Monte pacotes combinando seus serviços</p>
        </div>
        <div className="flex items-center gap-2">
          <GenericTrashBin
            items={trashItems}
            onRestore={(id) => restorePackage.mutate(id)}
            onPermanentDelete={(id) => permanentDeletePackage.mutate(id)}
            isRestoring={restorePackage.isPending}
            entityName="pacote"
          />
          <Button
            onClick={() => { setEditingPackageId(null); setIsModalOpen(true); }}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Novo Pacote
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de pacotes</p>
            <p className="text-2xl font-bold text-foreground">{totalPacotes}</p>
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
            <Input placeholder="Buscar por nome, descrição..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted border-border" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pacote</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serviços</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço Final</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {totalPacotes === 0 ? "Nenhum pacote cadastrado." : "Nenhum pacote encontrado."}
                </td></tr>
              ) : filtered.map((pkg) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  services={services}
                  formatCurrency={formatCurrency}
                  onEdit={() => { setEditingPackageId(pkg.id); setIsModalOpen(true); }}
                  onDelete={() => deletePackage.mutate(pkg.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filtered.length} de {totalPacotes} pacotes
        </div>
      </div>

      <PackageModal open={isModalOpen} onOpenChange={setIsModalOpen} packageId={editingPackageId} />
    </>
  );
};

const PackageRow = ({ pkg, services, formatCurrency, onEdit, onDelete }: {
  pkg: any;
  services: any[];
  formatCurrency: (v: number | null) => string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { data: packageServices = [] } = usePackageServicesForPackage(pkg.id);
  const serviceNames = packageServices
    .map((ps) => services.find((s) => s.id === ps.service_id)?.nome)
    .filter(Boolean);

  return (
    <tr
      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <td className="px-4 py-4">
        <p className="font-medium text-foreground">{pkg.nome}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {serviceNames.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : serviceNames.map((name, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{name}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-4 text-sm font-medium text-foreground">{formatCurrency(pkg.preco_final)}</td>
      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default PacotesPage;
