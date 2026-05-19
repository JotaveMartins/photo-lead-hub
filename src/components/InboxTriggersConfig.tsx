import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInboxTriggers, useCreateInboxTrigger } from "@/hooks/useInbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const InboxTriggersConfig = () => {
  const [newKeyword, setNewKeyword] = useState("");
  const { data: triggers = [], isLoading } = useInboxTriggers();
  const createTrigger = useCreateInboxTrigger();
  const queryClient = useQueryClient();

  const handleAddTrigger = async () => {
    if (!newKeyword.trim()) return;
    await createTrigger.mutateAsync(newKeyword.trim());
    setNewKeyword("");
  };

  const handleDeleteTrigger = async (id: string) => {
    const { error } = await supabase.from('inbox_triggers').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir trigger.");
    } else {
      toast.success("Trigger excluído.");
      queryClient.invalidateQueries({ queryKey: ["inbox_triggers"] });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle>Triggers da Inbox</CardTitle>
        </div>
        <CardDescription>
          Configure palavras-chave que criam automaticamente um Lead no seu Pipeline quando recebidas via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Ex: orçamento, casamento, preço..." 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="bg-muted/50 border-border"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrigger()}
          />
          <Button onClick={handleAddTrigger} disabled={!newKeyword.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Palavras-chave ativas</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
            ) : triggers.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full py-4 text-center border border-dashed border-border rounded-lg">
                Nenhuma palavra-chave configurada.
              </p>
            ) : (
              triggers.map((trigger) => (
                <div 
                  key={trigger.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border group hover:border-primary/50 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">"{trigger.keyword}"</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteTrigger(trigger.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InboxTriggersConfig;
