import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Cliente } from "@/hooks/useClientes";

interface ClienteTableProps {
  clientes: Cliente[];
  loading: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const ClienteTable = ({ clientes, loading, onEdit, onDelete, onNew }: ClienteTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando clientes...</div>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="p-4 rounded-full bg-muted">
          <UserPlus className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
        <Button onClick={onNew}>
          <UserPlus className="w-4 h-4 mr-2" />
          Cadastrar Cliente
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-foreground">Nome</TableHead>
            <TableHead className="text-foreground">WhatsApp</TableHead>
            <TableHead className="text-foreground">Email</TableHead>
            <TableHead className="text-foreground">Origem</TableHead>
            <TableHead className="text-foreground">Cadastro</TableHead>
            <TableHead className="text-foreground text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/30">
              <TableCell className="font-medium text-foreground">{c.nome}</TableCell>
              <TableCell className="text-muted-foreground">{c.whatsapp || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.origem || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(c)} className="h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClienteTable;
