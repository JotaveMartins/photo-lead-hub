import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, Bot, Play, Paperclip, X,
  Image as ImageIcon, Film, Mic, Loader2, FileText, RefreshCw, Zap,
} from "lucide-react";
import { MediaBubble } from "@/components/chat/MediaBubble";
import { QuickRepliesModal } from "@/components/chat/QuickRepliesModal";
import { EmojiPickerButton } from "@/components/chat/EmojiPickerButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useSendInboxMessage } from "@/hooks/useInbox";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeBrazilWhatsapp, whatsappMatchKey } from "@/lib/utils";
import { dedupeMessages } from "@/lib/dedupeMessages";
import { messageDayKey, formatMessageDayLabel } from "@/lib/formatMessageDay";

interface Props {
  leadId: string;
  leadWhatsapp: string | null;
}

const normalizeWhatsApp = (value: string | null | undefined) =>
  (value || "").replace(/\D/g, "");

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
  });

const formatMsgDate = (ts: string | null | undefined): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Ontem ${format(d, "HH:mm")}`;
  return format(d, "dd/MM HH:mm", { locale: ptBR });
};

const MEDIA_ACCEPT = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt";
const MAX_FILE_MB = 16;

// Envio de mensagens pela aba "Conversa" do lead está desativado por enquanto —
// a aba funciona apenas como visualizador. Basta trocar para `true` para reativar.
const ENABLE_LEAD_CHAT_COMPOSER = false;


// ── File type icon (for the pending attachment chip) ────────────────────────
const fileTypeIcon = (file: File) => {
  if (file.type.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5" />;
  if (file.type.startsWith("video/")) return <Film className="w-3.5 h-3.5" />;
  if (file.type.startsWith("audio/")) return <Mic className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

const resolveMediaType = (file: File): "image" | "video" | "audio" | "document" => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
};

// ── Main component ───────────────────────────────────────────────────────────
const LeadConversation = ({ leadId, leadWhatsapp }: Props) => {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea up to ~4 lines, then scroll
  const MAX_TEXTAREA_PX = 112;
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_PX) + "px";
  }, [text]);

  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const { data: instances = [] } = useWhatsAppInstances();
  const sendMessage = useSendInboxMessage();
  const activeInstance = instances.find((i: any) => i.status === "connected");

  // ── Find conversation ──────────────────────────────────────────────────────
  const { data: conv } = useQuery({
    queryKey: ["lead-conversation", leadId, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      // Fetch every conversation for this user — we'll pick the best one for this lead.
      const { data: all } = await supabase
        .from("inbox_conversations")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("updated_at", { ascending: false });

      const leadKey = whatsappMatchKey(leadWhatsapp);
      const candidates = (all || []).filter((c) => {
        if (c.lead_id === leadId) return true;
        if (!c.lead_id && leadKey && whatsappMatchKey(c.contact_number) === leadKey) return true;
        return false;
      });

      if (!candidates.length) return null;

      // Prefer: not-closed > most recently updated
      candidates.sort((a, b) => {
        const aClosed = a.status === "closed" ? 1 : 0;
        const bClosed = b.status === "closed" ? 1 : 0;
        if (aClosed !== bClosed) return aClosed - bClosed;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      const best = candidates[0];
      if (best.lead_id !== leadId) {
        await supabase.from("inbox_conversations").update({ lead_id: leadId }).eq("id", best.id);
        best.lead_id = leadId;
      }
      return best;
    },
    enabled: !!leadId && !!effectiveUserId,
  });

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    queryKey: ["inbox_messages", conv?.id],
    queryFn: async () => {
      if (!conv?.id) return [];
      const { data } = await supabase
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .eq("is_note", false)
        .order("timestamp", { ascending: true });
      return data || [];
    },
    enabled: !!conv?.id,
  });

  const displayedMessages = dedupeMessages(messages as any[]);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!conv?.id) return;
    const channel = supabase
      .channel(`lead-conv-${conv.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "inbox_messages",
        filter: `conversation_id=eq.${conv.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox_messages", conv.id] });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "inbox_conversations",
        filter: `id=eq.${conv.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv?.id, leadId, queryClient]);

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_FILE_MB} MB.`);
      return;
    }
    setPendingFile(file);
    // Local preview URL for images
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPendingFileUrl(URL.createObjectURL(file));
    } else {
      setPendingFileUrl(null);
    }
    e.target.value = "";
  };

  const clearFile = useCallback(() => {
    if (pendingFileUrl) URL.revokeObjectURL(pendingFileUrl);
    setPendingFile(null);
    setPendingFileUrl(null);
  }, [pendingFileUrl]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const hasText = text.trim().length > 0;
    const hasFile = !!pendingFile;
    if (!hasText && !hasFile) return;

    const number = normalizeBrazilWhatsapp(conv?.contact_number || leadWhatsapp || "");
    if (!number) { toast.error("Sem número de WhatsApp."); return; }
    if (!activeInstance) { toast.error("Nenhuma instância de WhatsApp conectada."); return; }

    const currentText = text.trim();
    setText("");

    setUploadingFile(hasFile);

    try {
      let conversationId = conv?.id ?? null;

      // Create conversation if needed.
      // Buscar-ou-criar: já pode existir uma conversa com esse número
      // (ex.: lead já no CRM com conversa criada por inbound). Fazemos a busca
      // manual em vez de upsert/ON CONFLICT porque o banco pode não ter a
      // constraint UNIQUE(user_id, contact_number).
      if (!conversationId) {
        if (!effectiveUserId) { toast.error("Usuário não identificado."); return; }

        // 1. Tenta reaproveitar uma conversa existente para esse número (fuzzy match)
        const { data: allUserConvs } = await supabase
          .from("inbox_conversations")
          .select("*")
          .eq("user_id", effectiveUserId)
          .order("updated_at", { ascending: false });
        const targetKey = whatsappMatchKey(number);
        const existing = (allUserConvs || [])
          .filter((c) => whatsappMatchKey(c.contact_number) === targetKey)
          .sort((a, b) => {
            const aClosed = a.status === "closed" ? 1 : 0;
            const bClosed = b.status === "closed" ? 1 : 0;
            return aClosed - bClosed;
          })[0];

        if (existing) {
          conversationId = existing.id;
          // Vincula ao lead atual se ainda não estiver
          if (existing.lead_id !== leadId) {
            await supabase.from("inbox_conversations").update({ lead_id: leadId }).eq("id", existing.id);
          }
          if (existing.status === "closed") {
            await supabase.from("inbox_conversations").update({ status: "open" }).eq("id", existing.id);
          }
        } else {
          // 2. Não existe — cria
          const { data: newConv, error: convError } = await supabase
            .from("inbox_conversations")
            .insert({
              user_id: effectiveUserId,
              contact_number: number,
              lead_id: leadId,
              status: "open",
              last_message: currentText || (pendingFile?.name ?? ""),
            })
            .select()
            .single();
          if (convError || !newConv) {
            toast.error("Erro ao criar conversa: " + (convError?.message || "tente novamente"));
            return;
          }
          conversationId = newConv.id;
        }
        queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
      } else if (conv?.status === "pending_ai") {
        await supabase.from("inbox_conversations").update({ status: "open" }).eq("id", conversationId);
      }

      if (hasFile) {
        const mediaType = resolveMediaType(pendingFile!);
        const base64 = await toBase64(pendingFile!);

        // Upload to Supabase storage so we can display it in the chat
        const filePath = `chat/${crypto.randomUUID()}-${pendingFile!.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("ai-files")
          .upload(filePath, pendingFile!);

        let publicUrl: string | undefined;
        if (!uploadErr) {
          const { data: { publicUrl: url } } = supabase.storage
            .from("ai-files")
            .getPublicUrl(filePath);
          publicUrl = url;
        }

        await sendMessage.mutateAsync({
          conversationId,
          number,
          instanceId: activeInstance.id,
          text: currentText || undefined,
          type: mediaType,
          mediaBase64: base64,
          mediaFilename: pendingFile!.name,
          mediaMimeType: pendingFile!.type,
          mediaUrl: publicUrl,
        });
        clearFile();
      } else {
        await sendMessage.mutateAsync({
          conversationId,
          number,
          instanceId: activeInstance.id,
          text: currentText,
          type: "text",
        });
      }
    } catch (err: any) {
      console.error(err);
      setText(currentText);
      const msg = err?.message || "tente novamente";
      if (typeof msg === "string" && msg.includes('"exists":false')) {
        toast.error("Esse número não está no WhatsApp. Verifique DDD/DDI ou se é um número Business.");
      } else {
        toast.error("Erro ao enviar: " + msg);
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleAI = async () => {
    if (!conv?.id) return;
    const newStatus = conv.status === "pending_ai" ? "open" : "pending_ai";
    await supabase.from("inbox_conversations").update({ status: newStatus }).eq("id", conv.id);
    queryClient.invalidateQueries({ queryKey: ["lead-conversation", leadId] });
    toast.success(newStatus === "pending_ai" ? "IA reativada" : "IA pausada");
  };

  const isSending = sendMessage.isPending || uploadingFile;

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    if (!conv?.id) {
      toast.error("Nenhuma conversa para sincronizar ainda.");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-inbox-messages", {
        body: { conversation_id: conv.id, take: 50 },
      });
      if (error) throw error;
      if (data?.ok === false) {
        const reasonMap: Record<string, string> = {
          no_connected_instance: "Nenhuma instância do WhatsApp conectada.",
          ambiguous_instance: "Conversa sem instância vinculada e há mais de uma instância conectada.",
          conversation_not_found: "Conversa não encontrada.",
          instance_not_found: "Instância do WhatsApp não encontrada.",
        };
        toast.error(reasonMap[data.reason] || "Não foi possível sincronizar.");
      } else {
        const inserted = data?.inserted ?? 0;
        if (inserted > 0) toast.success(`${inserted} nova(s) mensagem(ns) importada(s).`);
        else toast.info("Nenhuma mensagem nova.");
        queryClient.invalidateQueries({ queryKey: ["inbox_messages", conv.id] });
      }
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + (e?.message || "tente novamente"));
    } finally {
      setSyncing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-lg overflow-hidden border border-border">

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card shrink-0">
        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
          {conv?.contact_number || leadWhatsapp || "—"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSync}
            disabled={syncing || !conv?.id}
            title="Recarregar mensagens do WhatsApp"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
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
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {displayedMessages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          displayedMessages.map((m: any, idx: number) => {
            const isOut = m.direction === "outbound";
            const ts = m.timestamp || m.created_at;
            const prev = idx > 0 ? displayedMessages[idx - 1] : null;
            const prevTs = prev ? (prev.timestamp || prev.created_at) : null;
            const showDayDivider = messageDayKey(ts) !== messageDayKey(prevTs);
            return (
              <div key={m.id}>
                {showDayDivider && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                      {formatMessageDayLabel(ts)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                      isOut
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
                    }`}
                  >
                    <MediaBubble m={m} />
                    <span className="text-[9px] block mt-1 text-right opacity-50">
                      {formatMsgDate(ts)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending file preview */}
      {ENABLE_LEAD_CHAT_COMPOSER && pendingFile && (
        <div className="px-3 py-2 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5 text-xs">
            {pendingFileUrl && pendingFile.type.startsWith("image/") ? (
              <img src={pendingFileUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            ) : (
              <span className="text-primary shrink-0">{fileTypeIcon(pendingFile)}</span>
            )}
            <span className="truncate flex-1 text-foreground">{pendingFile.name}</span>
            <span className="text-muted-foreground shrink-0">
              {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              onClick={clearFile}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      {ENABLE_LEAD_CHAT_COMPOSER ? (
      <div className="px-3 py-2 border-t border-border bg-card shrink-0">
        <div className="flex items-end gap-2">
          {/* Attach file */}
          <input
            ref={fileInputRef}
            type="file"
            accept={MEDIA_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title="Anexar arquivo"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Quick replies */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => setShowQuickReplies(true)}
            disabled={isSending}
            title="Respostas rápidas"
          >
            <Zap className="w-4 h-4" />
          </Button>

          {/* Emoji */}
          <EmojiPickerButton
            disabled={isSending}
            onSelect={(emoji) => setText((prev) => prev + emoji)}
          />

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            placeholder={pendingFile ? "Adicionar legenda (opcional)..." : "Digite uma mensagem..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none min-h-[36px] py-2 text-sm bg-muted border-border overflow-y-auto"
            style={{ maxHeight: MAX_TEXTAREA_PX }}
            disabled={isSending}
          />

          {/* Send */}
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-gradient-primary"
            onClick={handleSend}
            disabled={isSending || (!text.trim() && !pendingFile)}
            title="Enviar"
          >
            {isSending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 pl-1">
          Enter para enviar · Shift+Enter nova linha · Máx {MAX_FILE_MB} MB
        </p>
      </div>
      ) : (
        <div className="px-3 py-2 border-t border-border bg-card shrink-0">
          <p className="text-[11px] text-muted-foreground text-center">
            Visualização somente leitura. Responda pelo Inbox.
          </p>
        </div>
      )}

      <QuickRepliesModal
        open={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        onSelect={(body) => setText((prev) => (prev ? prev + "\n" + body : body))}
      />
    </div>
  );
};

export default LeadConversation;
