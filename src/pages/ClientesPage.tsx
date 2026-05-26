import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { UserPlus, Bell, Trash2, RotateCcw, Trash } from "lucide-react";
import { useClientes, useDeleteCliente, useDeletedClientes, useRestoreCliente, usePermanentDeleteCliente, type Cliente } from "@/hooks/useClientes";
import ClienteCards from "@/components/clientes/ClienteCards";
import ClienteTable from "@/components/clientes/ClienteTable";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import EditClienteModal from "@/components/clientes/EditClienteModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTodayClienteTasks } from "@/hooks/useLeadTasks";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ClientesPage = () => {
  const [search, setSearch] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState<Cliente | null>(null);
  const navigate = useNavigate();

  const { data: clientes = [], isLoading } = useClientes(search);
  const { data: deletedClientes = [] } = useDeletedClientes();
  const deleteCliente = useDeleteCliente();
  const restoreCliente = useRestoreCliente();
  const permanentDeleteCliente = usePermanentDeleteCliente();
  const { data: clienteTasksToday = [] } = useTodayClienteTasks();

  const handleDelete = (id: string) => {
    if (confirm("Arquivar este cliente? Ele poderá ser restaurado depois.")) {
      deleteCliente.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus clientes cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={bellOpen} onOpenChange={setBellOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {clienteTasksToday.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {clienteTasksToday.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Tarefas de clientes</p>
                <p className="text-xs text-muted-foreground">{clienteTasksToday.length} pendentes para hoje ou atrasadas</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {clienteTasksToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa pendente 🎉</p>
                ) : (
                  clienteTasksToday.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setBellOpen(false); navigate(`/clientes/${t.cliente_id}`); }}
                      className="w-full text-left px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50"
                    >
                      <p className="text-sm text-foreground truncate">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground">{t.clientes?.nome || "—"}</p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowArchived((v) => !v)}>
            <Trash2 className="w-3.5 h-3.5" />
            Arquivados
            {deletedClientes.length > 0 && (
              <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                {deletedClientes.length}
              </span>
            )}
          </Button>
          <Button onClick={() => setNovoOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <ClienteCards clientes={clientes} />

      <SearchInput
        containerClassName="max-w-sm"
        placeholder="Buscar por nome, email ou WhatsApp..."
        value={search}
        onValueChange={setSearch}
      />

      <ClienteTable
        clientes={clientes}
        loading={isLoading}
        onEdit={(c) => setEditCliente(c)}
        onDelete={handleDelete}
        onNew={() => setNovoOpen(true)}
      />

      {/* Archived clients panel */}
      {showArchived && (
        <div className="border border-border rounded-xl p-4">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
            <Trash2 className="w-4 h-4 text-muted-foreground" /> Clientes Arquivados
            <span className="text-xs text-muted-foreground ml-1">({deletedClientes.length})</span>
          </h2>
          {deletedClientes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum cliente arquivado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {deletedClientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 opacity-70">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.email || c.whatsapp || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => restoreCliente.mutate(c.id)}>
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Excluir permanentemente" onClick={() => setPermDeleteTarget(c)}>
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NovoClienteModal open={novoOpen} onClose={() => setNovoOpen(false)} />
      <EditClienteModal open={!!editCliente} onClose={() => setEditCliente(null)} cliente={editCliente} />

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!permDeleteTarget} onOpenChange={(v) => !v && setPermDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente{" "}
              <span className="font-semibold text-foreground">{permDeleteTarget?.nome}</span>{" "}
              será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (permDeleteTarget) { permanentDeleteCliente.mutate(permDeleteTarget.id); setPermDeleteTarget(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientesPage;
