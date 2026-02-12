import { useState } from "react";
import { Plus, Package, Search, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePackages, useDeletePackage } from "@/hooks/usePackages";
import PackageModal from "@/components/PackageModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PacotesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: packages = [], isLoading } = usePackages();
  const deletePackage = useDeletePackage();

  const filtered = packages.filter((p) =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "—";

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Pacotes
          </h1>
          <p className="text-muted-foreground mt-1">{packages.length} pacotes cadastrados</p>
        </div>
        <Button
          onClick={() => { setEditingPackageId(null); setIsModalOpen(true); }}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Novo Pacote
        </Button>
      </header>

      <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar pacote..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted border-border" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pacote</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço Final</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum pacote encontrado.</td></tr>
              ) : filtered.map((pkg: any) => (
                <tr key={pkg.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{pkg.nome}</p>
                      {pkg.descricao && <p className="text-sm text-muted-foreground line-clamp-1">{pkg.descricao}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm px-2 py-1 rounded-full bg-primary/10 text-primary">{pkg.categoria || "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{formatCurrency(pkg.preco_final)}</td>
                  <td className="px-4 py-4 text-right">
                    {!pkg.is_default && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingPackageId(pkg.id); setIsModalOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(pkg.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PackageModal open={isModalOpen} onOpenChange={setIsModalOpen} packageId={editingPackageId} />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pacote?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) { deletePackage.mutate(deletingId); setDeletingId(null); } }} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PacotesPage;
