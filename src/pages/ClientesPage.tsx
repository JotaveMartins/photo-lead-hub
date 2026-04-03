import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search } from "lucide-react";
import { useClientes, useDeleteCliente, type Cliente } from "@/hooks/useClientes";
import ClienteCards from "@/components/clientes/ClienteCards";
import ClienteTable from "@/components/clientes/ClienteTable";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import EditClienteModal from "@/components/clientes/EditClienteModal";

const ClientesPage = () => {
  const [search, setSearch] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useClientes(search);
  const deleteCliente = useDeleteCliente();

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
        <Button onClick={() => setNovoOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <ClienteCards clientes={clientes} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

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
