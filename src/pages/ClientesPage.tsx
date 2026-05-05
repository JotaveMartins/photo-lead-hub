import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { UserPlus, Bell } from "lucide-react";
import { useClientes, useDeleteCliente, type Cliente } from "@/hooks/useClientes";
import ClienteCards from "@/components/clientes/ClienteCards";
import ClienteTable from "@/components/clientes/ClienteTable";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import EditClienteModal from "@/components/clientes/EditClienteModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTodayClienteTasks } from "@/hooks/useLeadTasks";
import { useNavigate } from "react-router-dom";

const ClientesPage = () => {
  const [search, setSearch] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const navigate = useNavigate();

  const { data: clientes = [], isLoading } = useClientes(search);
  const deleteCliente = useDeleteCliente();
  const { data: clienteTasksToday = [] } = useTodayClienteTasks();

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
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

      <NovoClienteModal open={novoOpen} onClose={() => setNovoOpen(false)} />
      <EditClienteModal open={!!editCliente} onClose={() => setEditCliente(null)} cliente={editCliente} />
    </div>
  );
};

export default ClientesPage;
