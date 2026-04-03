import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { useDeletedCobrancas, useRestoreCobranca, usePermanentDeleteCobranca } from "@/hooks/useCobrancas";
import { Button } from "@/components/ui/button";
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

const CobrancaTrashBin = () => {
  const { data: deleted = [] } = useDeletedCobrancas();
  const restore = useRestoreCobranca();
  const permanentDelete = usePermanentDeleteCobranca();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
            title="Lixeira"
          >
            <Trash2 className="w-4 h-4" />
            {deleted.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-muted-foreground/60 text-background rounded-full text-[10px] font-bold flex items-center justify-center">
                {deleted.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="bg-card border-border w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Trash2 className="w-5 h-5" />
              Lixeira de Cobranças
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            {deleted.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">A lixeira está vazia</p>
            ) : (
              deleted.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm">{c.descricao || "Sem descrição"}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.deleted_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {" • "}Venc. {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => restore.mutate(c.id)}
                      disabled={restore.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restaurar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeletingId(c.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A cobrança será removida definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingId) {
                  permanentDelete.mutate(deletingId);
                  setDeletingId(null);
                }
              }}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CobrancaTrashBin;
