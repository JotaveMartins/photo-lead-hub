import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HardHat, Plus, Pencil, Trash2, Phone } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useTeamMembers, useDeleteTeamMember, type TeamMember } from "@/hooks/useTeamMembers";
import TeamMemberModal from "@/components/equipe/TeamMemberModal";

const EquipePage = () => {
  const { data: members = [], isLoading } = useTeamMembers();
  const del = useDeleteTeamMember();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const total = members.length;
  const totalEventos = members.reduce((s, m) => s + (m.eventos_count || 0), 0);

  const handleEdit = (m: TeamMember) => {
    setEditing(m);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover este profissional? O histórico de eventos é mantido.")) {
      del.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <HardHat className="w-7 h-7 text-primary" />
            Equipe
          </h1>
          <p className="text-sm text-muted-foreground">Profissionais e freelancers cadastrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-primary hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" /> Novo Profissional
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-primary/10"><HardHat className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Profissionais</p><p className="text-2xl font-bold text-foreground">{total}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-green-500/10"><HardHat className="w-5 h-5 text-green-500" /></div>
            <div><p className="text-sm text-muted-foreground">Total de eventos atendidos</p><p className="text-2xl font-bold text-foreground">{totalEventos}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <HardHat className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setEditing(null); setOpen(true); }}>Cadastrar primeiro profissional</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/30">
                <TableHead className="font-medium">Nome</TableHead>
                <TableHead className="font-medium">Função</TableHead>
                <TableHead className="font-medium">Telefone</TableHead>
                <TableHead className="font-medium">Eventos</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="border-border hover:bg-muted/40 cursor-pointer" onClick={() => handleEdit(m)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{m.nome}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{m.funcao || "—"}</span>
                  </TableCell>
                  <TableCell>
                    {m.telefone ? (
                      <span className="text-sm text-muted-foreground inline-flex items-center gap-1"><Phone className="w-3 h-3" />{m.telefone}</span>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {m.eventos_count || 0} {m.eventos_count === 1 ? "evento" : "eventos"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEdit(m)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <TeamMemberModal open={open} onOpenChange={setOpen} member={editing} />
    </div>
  );
};

export default EquipePage;