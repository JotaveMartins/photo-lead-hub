import { useEffect, useRef, useState } from "react";
import { Send, Bot, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useSendInboxMessage } from "@/hooks/useInbox";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  leadId: string;
  leadWhatsapp: string | null;
}

const normalizeWhatsApp = (value: string | null | undefined) => (value || "").replace(/\D/g, "");

const LeadConversation = ({ leadId, leadWhatsapp }: Props) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: instances = [] } = useWhatsAppInstances();
  const sendMessage = useSendInboxMessage();
  const activeInstance = instances.find((i: any) => i.status === "connected");

  const { data: conv } = useQuery({
    queryKey: ["lead-conversation", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("lead_id", leadId)
        .order("updated_at", { ascending: false });

      if (data?.length) {
        const activeConversation = data.find((item) => item.status !== "closed");
        return activeConversation || data[0];
      }

      const normalizedLeadWhatsapp = normalizeWhatsApp(leadWhatsapp);

      if (!normalizedLeadWhatsapp) return null;

      const { data: numberMatches } = await supabase
        .from("inbox_conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      const matchedConversation = (numberMatches || []).find((item) => {
        const current = normalizeWhatsApp(item.contact_number);
        return current === normalizedLeadWhatsapp || current.endsWith(normalizedLeadWhatsapp) || normalizedLeadWhatsapp.endsWith(current);
      });

      if (matchedConversation && matchedConversation.lead_id !== leadId) {
        await supabase.from("inbox_conversations").update({ lead_id: leadId }).eq("id", matchedConversation.id);
      }

      return matchedConversation || null;
    },
    enabled: !!leadId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["inbox_messages", conv?.id],
    queryFn: async () => {
      if (!conv?.id) return [];
      const { data } = await supabase
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("timestamp", { ascending: true });
      return data || [];
    },
    enabled: !!conv?.id,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!conv?.id) return;
    const channel = supabase
      .channel(`lead-conv-${conv.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `conversation_id=eq.${conv.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox_messages", conv.id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "inbox_conversations", filter: `id=eq.${conv.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv?.id, leadId, queryClient]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const number = (conv?.contact_number || leadWhatsapp || "").replace(/\D/g, "");
    if (!number) { toast.error("Sem número de WhatsApp."); return; }
    if (!activeInstance) { toast.error("Nenhuma instância de WhatsApp conectada."); return; }
    
    const currentText = text;
    setText("");

    try {
      if (!conv?.id) {
        const { data: user } = await supabase.auth.getUser();
        const { data: newConv } = await supabase.from("inbox_conversations").insert({
          user_id: user.user!.id,
          contact_number: number,
          lead_id: leadId,
          status: "open",
          last_message: currentText,
        }).select().single();
        if (!newConv) { toast.error("Erro ao criar conversa"); return; }
        await sendMessage.mutateAsync({ conversationId: newConv.id, number, text: currentText, instanceId: activeInstance.id });
        queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
      } else {
        if (conv.status === 'pending_ai') {
          await supabase.from("inbox_conversations").update({ status: 'open' }).eq("id", conv.id);
        }
        await sendMessage.mutateAsync({ conversationId: conv.id, number, text: currentText, instanceId: activeInstance.id });
      }
    } catch (error) {
      console.error(error);
      setText(currentText);
    }
  };

  const toggleAI = async () => {
    if (!conv?.id) return;
    const newStatus = conv.status === "pending_ai" ? "open" : "pending_ai";
    await supabase.from("inbox_conversations").update({ status: newStatus }).eq("id", conv.id);
    queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
    toast.success(newStatus === "pending_ai" ? "IA reativada" : "IA pausada");
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-lg overflow-hidden border border-border">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card">
        <span className="text-xs text-muted-foreground">{conv?.contact_number || leadWhatsapp || "—"}</span>
        {conv?.id && (
          conv.status === "pending_ai" ? (
            <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600" onClick={toggleAI}>
              <Play className="w-3 h-3 mr-1" /> Abrir Atendimento
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleAI}>
              <Bot className="w-3 h-3 mr-1" /> Voltar para IA
            </Button>
          )
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border border-border/50"}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <span className="text-[9px] block mt-1 text-right opacity-60">
                  {m.timestamp ? format(new Date(m.timestamp), "HH:mm") : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button size="icon" className="bg-gradient-primary" onClick={handleSend} disabled={!text.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadConversation;