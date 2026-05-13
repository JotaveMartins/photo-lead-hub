import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserPlus, Trash2, Copy, Check, LogIn, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useToast } from "@/hooks/use-toast";
import CreateUserModal from "@/components/CreateUserModal";
import EditAdminUserModal from "@/components/admin/EditAdminUserModal";

const AdminPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ user_id: string; nome: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const { users, isLoading, deleteUser } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const { startImpersonation } = useImpersonation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.user_id);
      toast({ title: "Cliente excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleCopy = (id: string, senha: string) => {
    navigator.clipboard.writeText(senha);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImpersonate = (userId: string, nome: string) => {
    startImpersonation(userId, nome);
    navigate("/leads");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie as contas dos seus clientes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Senha</TableHead>
              <TableHead>Acessar</TableHead>
              <TableHead>Meta / CPL</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum cliente cadastrado</TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {(user as any).senha ? (
                      <div className="flex items-center gap-1">
                        <code className="text-sm font-mono text-primary">{(user as any).senha}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(user.id, (user as any).senha)}
                        >
                          {copiedId === user.id ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonate(user.user_id, user.nome)}
                      className="gap-1.5 text-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Entrar
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(user)}
                      className="gap-1.5 text-xs"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {(user as any).meta_ad_account_id ? "Configurado" : "Configurar"}
                    </Button>
                  </TableCell>
                   <TableCell>
                     {(user as any).ultimo_acesso ? (
                       <span className="text-sm">{format(new Date((user as any).ultimo_acesso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                     ) : (
                       <span className="text-muted-foreground text-sm">Nunca</span>
                     )}
                   </TableCell>
                   <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    {user.user_id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ user_id: user.user_id, nome: user.nome })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserModal open={showModal} onOpenChange={setShowModal} />
      <EditAdminUserModal open={!!editTarget} onClose={() => setEditTarget(null)} user={editTarget} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação é irreversível e todos os dados do cliente serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPage;
