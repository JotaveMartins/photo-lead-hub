import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTeamMember, useUpdateTeamMember, type TeamMember } from "@/hooks/useTeamMembers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member?: TeamMember | null;
  onCreated?: (id: string) => void;
}

const TeamMemberModal = ({ open, onOpenChange, member, onCreated }: Props) => {
  const create = useCreateTeamMember();
  const update = useUpdateTeamMember();
  const isEditing = !!member;

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [funcao, setFuncao] = useState("");

  useEffect(() => {
    if (open) {
      setNome(member?.nome || "");
      setTelefone(member?.telefone || "");
      setFuncao(member?.funcao || "");
    }
  }, [open, member]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    if (isEditing && member) {
      await update.mutateAsync({ id: member.id, nome: nome.trim(), telefone: telefone.trim() || null, funcao: funcao.trim() || null });
    } else {
      const row = await create.mutateAsync({ nome: nome.trim(), telefone: telefone.trim() || null, funcao: funcao.trim() || null });
      onCreated?.(row.id);
    }
    onOpenChange(false);
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-muted border-border" required />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="bg-muted border-border" />
          </div>
          <div className="space-y-2">
            <Label>Função (opcional)</Label>
            <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Ex: 2º fotógrafo, filmmaker" className="bg-muted border-border" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pending || !nome.trim()}>
              {pending ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberModal;