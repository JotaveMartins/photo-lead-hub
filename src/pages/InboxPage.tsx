import { useState, useRef, useEffect } from "react";
import { Inbox as InboxIcon, Search, Filter, Send, UserPlus, User, MessageSquare, Bot, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  useInboxConversations, 
  useInboxMessages, 
  useUpdateConversation, 
  useSendInboxMessage,
  InboxStatus 
} from "@/hooks/useInbox";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreateLead } from "@/hooks/useLeads";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const InboxPage = () => {
  const [activeStatus, setActiveStatus] = useState<InboxStatus>('pending_ai');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loadingConvs } = useInboxConversations(activeStatus);
  const { data: messages = [], isLoading: loadingMsgs } = useInboxMessages(selectedConversationId || undefined);
  const { data: instances = [] } = useWhatsAppInstances();
  const updateConv = useUpdateConversation();
  const sendMessage = useSendInboxMessage();
  const createLead = useCreateLead();

  const selectedConv = conversations.find(c => c.id === selectedConversationId);
  const activeInstance = instances.find(i => i.status === 'connected');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Realtime subscription: new inbox messages and conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inbox_messages'] });
        queryClient.invalidateQueries({ queryKey: ['inbox_conversations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inbox_conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filteredConversations = conversations.filter(c => 
    (c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.contact_number.includes(searchTerm))
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConv || !activeInstance) {
      if (!activeInstance) toast.error("Nenhuma instância de WhatsApp conectada.");
      return;
    }

    const currentText = messageText;
    setMessageText("");

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConv.id,
        number: selectedConv.contact_number,
        text: currentText,
        instanceId: activeInstance.id
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar mensagem.");
      setMessageText(currentText); // Restore if failed
    }
  };

  const handleOpenAtendimento = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: 'open' });
    toast.success("Atendimento aberto.");
  };

  // Removed auto-pause AI on click
  /*
  useEffect(() => {
    if (selectedConv && selectedConv.status === 'pending_ai') {
      updateConv.mutate({ id: selectedConv.id, status: 'open' });
    }
  }, [selectedConversationId]);
  */

  const handleReturnToAI = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: 'pending_ai' });
    toast.success("IA reativada para esta conversa.");
  };

  const handleClose = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({
      id: selectedConv.id,
      status: 'closed'
    });
    toast.success("Atendimento encerrado.");
  };

  const handleCreateLead = async () => {
    if (!selectedConv) return;
    try {
      const lead = await createLead.mutateAsync({
        nome: selectedConv.contact_name || `Contato ${selectedConv.contact_number}`,
        whatsapp: selectedConv.contact_number.replace(/\D/g, ''),
        status: 'Novo Lead',
        origem: 'WhatsApp Inbox'
      });
      
      await updateConv.mutateAsync({
        id: selectedConv.id,
        lead_id: lead.id
      });
      
      toast.success("Lead criado e vinculado!");
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status: InboxStatus) => {
    switch (status) {
      case 'pending_ai': return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50 flex gap-1 items-center"><Bot className="w-3 h-3"/> IA Ativa</Badge>;
      case 'open': return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">Em Atendimento</Badge>;
      case 'closed': return <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border-gray-500/50">Fechado</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <InboxIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Inbox</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar conversas..." 
              className="pl-9 bg-muted/50 border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Conversations List */}
        <div className="w-full lg:w-[35%] flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex border-b border-border">
            <button 
              onClick={() => setActiveStatus('pending_ai')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeStatus === 'pending_ai' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              PENDENTES
            </button>
            <button 
              onClick={() => setActiveStatus('open')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeStatus === 'open' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              ABERTOS
            </button>
            <button 
              onClick={() => setActiveStatus('closed')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeStatus === 'closed' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              FECHADOS
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {loadingConvs ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma conversa encontrada.</div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full p-4 flex gap-3 text-left transition-all hover:bg-muted/50 relative group ${selectedConversationId === conv.id ? 'bg-muted shadow-inner' : ''}`}
                  >
                    {/* Status vertical indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      conv.status === 'pending_ai' ? 'bg-yellow-500' : 
                      conv.status === 'open' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    
                    <Avatar className="w-12 h-12 border-2 border-border/50">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-muted text-foreground">
                        <User className="w-6 h-6 opacity-40" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-foreground truncate max-w-[140px]">
                          {conv.contact_name || conv.contact_number}
                        </h3>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {conv.updated_at ? format(new Date(conv.updated_at), 'HH:mm', { locale: ptBR }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {conv.last_message || 'Nenhuma mensagem'}
                      </p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(conv.status)}
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold shadow-glow">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="hidden lg:flex flex-1 flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarFallback><User className="w-5 h-5 text-primary" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-bold text-foreground leading-tight">{selectedConv.contact_name || selectedConv.contact_number}</h2>
                    <p className="text-xs text-muted-foreground">{selectedConv.contact_number}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedConv.lead_id ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-cyan-400 border-cyan-400/30 bg-cyan-400/5 hover:bg-cyan-400/10"
                      onClick={() => navigate(`/leads?id=${selectedConv.lead_id}`)}
                    >
                      Ver Lead
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-dashed"
                      onClick={handleCreateLead}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Lead
                    </Button>
                  )}

                  {selectedConv.status === 'open' && (
                    <>
                      <Button
                        onClick={handleReturnToAI}
                        size="sm"
                        className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border border-yellow-500/50"
                        variant="outline"
                      >
                        <Play className="w-4 h-4 mr-1" /> Voltar para IA
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClose}>Encerrar</Button>
                    </>
                  )}
                  {selectedConv.status === 'pending_ai' && (
                    <Button 
                      onClick={handleOpenAtendimento}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Play className="w-4 h-4 mr-1" /> Abrir Atendimento
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-4">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">Inicie uma conversa.</div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm relative ${
                          msg.direction === 'outbound' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted text-foreground rounded-tl-none border border-border/50'
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <span className={`text-[9px] block mt-1 text-right opacity-60`}>
                            {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-border bg-muted/20">
                <div className="flex gap-2">
                  <Input 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escreva sua mensagem..." 
                    className="flex-1 bg-background border-border"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    size="icon" 
                    className="bg-primary hover:bg-primary/90 shadow-glow"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
              <MessageSquare className="w-16 h-16 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Selecione um chat</h3>
              <p className="max-w-[280px]">Escolha uma conversa na lista lateral para visualizar as mensagens e interagir.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
