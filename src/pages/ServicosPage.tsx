import { useState } from "react";
import { Plus, Wrench, Search, Pencil, Trash2, MoreHorizontal, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServices, useDeleteService, type Service } from "@/hooks/useServices";
import ServiceModal from "@/components/ServiceModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ServicosPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: services = [], isLoading } = useServices();
  const deleteService = useDeleteService();

  const filtered = services.filter((s) =>
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalServices = services.length;
  const ticketMedio = totalServices > 0
    ? services.reduce((sum, s) => sum + s.valor_base, 0) / totalServices
    : 0;

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
        <Button
          onClick={() => { setEditingService(null); setIsModalOpen(true); }}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </Button>
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
            <Input placeholder="Buscar serviço..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted border-border" />
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
                  <tr key={service.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingService(service); setIsModalOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(service.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) { deleteService.mutate(deletingId); setDeletingId(null); } }} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServicosPage;
