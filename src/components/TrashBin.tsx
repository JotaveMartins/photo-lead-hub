import { useMemo, useState } from "react";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { useDeletedLeads, useRestoreLead, usePermanentDeleteLead } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneInternational } from "@/lib/formatters";

const TrashBin = () => {
  const { data: deletedLeads = [] } = useDeletedLeads();
  const restoreLead = useRestoreLead();
  const permanentDelete = usePermanentDeleteLead();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return deletedLeads;
    return deletedLeads.filter(
      (lead) =>
        lead.nome.toLowerCase().includes(term) ||
        lead.whatsapp.toLowerCase().includes(term)
    );
  }, [deletedLeads, searchTerm]);

  const handlePermanentDelete = async () => {
    if (deletingId) {
      await permanentDelete.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
            title="Lixeira"
          >
            <Trash2 className="w-4 h-4" />
            {deletedLeads.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-muted-foreground/60 text-background rounded-full text-[10px] font-bold flex items-center justify-center">
                {deletedLeads.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md bg-card border-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Trash2 className="w-5 h-5 text-muted-foreground" />
              Lixeira
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            <SearchInput
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Buscar por nome ou WhatsApp..."
              containerClassName="shrink-0"
            />
            {filteredLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {searchTerm ? "Nenhum lead encontrado" : "A lixeira está vazia"}
              </p>
            ) : (
              filteredLeads.map((lead) => {
                const formatted = formatPhoneInternational(lead.whatsapp);

                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                      <p className="text-[11px] text-foreground/80 truncate">{formatted}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Excluído {formatDistanceToNow(new Date(lead.deleted_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary"
                        onClick={() => restoreLead.mutate(lead.id)}
                        disabled={restoreLead.isPending}
                        title="Restaurar"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(lead.id)}
                        title="Excluir permanentemente"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TrashBin;
