import { useState } from "react";
import { Zap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuickReplies, useCreateQuickReply, useDeleteQuickReply } from "@/hooks/useQuickReplies";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (body: string) => void;
}

export const QuickRepliesModal = ({ open, onClose, onSelect }: Props) => {
  const { data: replies = [], isLoading } = useQuickReplies();
  const createReply = useCreateQuickReply();
  const deleteReply = useDeleteQuickReply();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    await createReply.mutateAsync({ title: newTitle.trim(), body: newBody.trim() });
    setNewTitle(""); setNewBody(""); setShowNew(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Respostas Rápidas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : replies.length === 0 && !showNew ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Nenhuma resposta cadastrada ainda.
            </p>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="group flex items-start gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.body}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="default" className="h-7 px-3 text-xs" onClick={() => { onSelect(r.body); onClose(); }}>
                    Usar
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteReply.mutate(r.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {showNew ? (
          <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/20">
            <div className="space-y-1">
              <Label>Título (atalho)</Label>
              <Input placeholder="Ex: Preços, Disponibilidade..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea placeholder="Digite a mensagem completa..." value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim() || !newBody.trim()}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Nova resposta
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickRepliesModal;