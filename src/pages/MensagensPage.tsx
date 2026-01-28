import { useState } from "react";
import { MessageSquare, Send, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMessages, useCreateMessage } from "@/hooks/useMessages";
import { useLeads } from "@/hooks/useLeads";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const MensagensPage = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: leads = [] } = useLeads();
  const { data: messages = [] } = useMessages(selectedLeadId || undefined);
  const createMessage = useCreateMessage();

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLeadId) return;

    await createMessage.mutateAsync({
      lead_id: selectedLeadId,
      content: newMessage.trim(),
      direction: "outgoing",
    });

    // Open WhatsApp
    if (selectedLead) {
      window.open(
        `https://wa.me/55${selectedLead.whatsapp}?text=${encodeURIComponent(newMessage)}`,
        "_blank"
      );
    }

    setNewMessage("");
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Mensagens
        </h1>
        <p className="text-muted-foreground mt-1">
          Histórico de comunicação com leads
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Leads List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <Input
              placeholder="Buscar lead..."
              className="bg-muted border-border"
            />
          </div>

          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum lead cadastrado
              </p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full p-4 text-left border-b border-border/50 hover:bg-muted/50 transition-colors ${
                    selectedLeadId === lead.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {lead.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.interesse || "Sem interesse definido"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {selectedLead.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedLead.nome}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedLead.whatsapp}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://wa.me/55${selectedLead.whatsapp}`, "_blank")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                      Nenhuma mensagem registrada.<br />
                      <span className="text-sm">
                        Registre suas conversas para manter o histórico.
                      </span>
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "outgoing" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-xl ${
                          message.direction === "outgoing"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.direction === "outgoing" 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        }`}>
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Registre a mensagem enviada..."
                    className="bg-muted border-border resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-primary hover:opacity-90 self-end"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ao enviar, o WhatsApp será aberto com a mensagem pronta.
                </p>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um lead para ver as mensagens</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MensagensPage;
