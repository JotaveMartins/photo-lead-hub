import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Cliente } from "@/hooks/useClientes";
import { useClienteTaskCounts } from "@/hooks/useLeadTasks";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

interface ClienteTableProps {
  clientes: Cliente[];
  loading: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const ClienteTable = ({ clientes, loading, onEdit, onDelete, onNew }: ClienteTableProps) => {
  const navigate = useNavigate();
  const { data: taskCounts = {} } = useClienteTaskCounts();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando clientes...</div>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Nenhum cliente cadastrado"
        description="Cadastre o primeiro cliente para começar."
        action={<Button onClick={onNew}><UserPlus className="w-4 h-4 mr-2" />Novo Cliente</Button>}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-foreground">Nome</TableHead>
            <TableHead className="text-foreground w-24">Tarefas</TableHead>
            <TableHead className="text-foreground">WhatsApp</TableHead>
            <TableHead className="text-foreground">Email</TableHead>
            <TableHead className="text-foreground">Origem</TableHead>
            <TableHead className="text-foreground">Cadastro</TableHead>
            <TableHead className="text-foreground text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => {
            const counts = taskCounts[c.id];
            // Verde = pendentes futuras, Vermelho = atrasadas/hoje, Cinza = sem tarefas
            const status = !counts || (counts.atrasadas + counts.hoje + counts.futuras === 0)
              ? { color: "bg-muted-foreground/40", label: "Sem tarefas", text: "—" }
              : counts.atrasadas + counts.hoje > 0
              ? { color: "bg-destructive", label: `${counts.atrasadas + counts.hoje} pendente(s)`, text: String(counts.atrasadas + counts.hoje) }
              : { color: "bg-[hsl(var(--status-success))]", label: `${counts.futuras} futura(s)`, text: String(counts.futuras) };
            return (
            <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
              <TableCell className="font-medium text-foreground">{c.nome}</TableCell>
              <TableCell>
                <span title={status.label} className="inline-flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", status.color)} />
                  <span className="text-xs text-muted-foreground">{status.text}</span>
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{c.whatsapp || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.origem || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(c)} className="h-10 w-10" aria-label="Editar cliente" title="Editar cliente">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)} className="h-10 w-10 text-muted-foreground hover:text-destructive" aria-label="Arquivar cliente" title="Arquivar cliente">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClienteTable;
