import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Inbox as InboxIcon, Search, Send, UserPlus, User, MessageSquare, Bot,
  Play, ChevronLeft, StickyNote, Zap, X, Plus, Trash2, Check, ExternalLink,
  MoreVertical, ChevronDown, Paperclip, Loader2, Film, Mic, FileText, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { MediaBubble } from "@/components/chat/MediaBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  useInboxConversations,
  useInboxMessages,
  useInboxMessageSearch,
  useUpdateConversation,
  useSendInboxMessage,
  useMarkConversationRead,
  useAddConversationNote,
  useConversationNotes,
  InboxStatus,
} from "@/hooks/useInbox";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreateLead } from "@/hooks/useLeads";
import LeadModal from "@/components/LeadModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useQuickReplies, useCreateQuickReply, useDeleteQuickReply } from "@/hooks/useQuickReplies";
import { QuickRepliesModal } from "@/components/chat/QuickRepliesModal";
import { EmojiPickerButton } from "@/components/chat/EmojiPickerButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatMsgDate = (ts: string | null): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Ontem ${format(d, "HH:mm")}`;
  return format(d, "dd/MM HH:mm", { locale: ptBR });
};

const formatConvDate = (ts: string): string => {
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM", { locale: ptBR });
};

const getMatchSnippet = (text: string, term: string, maxLen = 80): string => {
  const t = term.trim();
  if (!t) return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  const lowerText = text.toLowerCase();
  const lowerTerm = t.toLowerCase();
  const idx = lowerText.indexOf(lowerTerm);
  if (idx === -1) return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  const context = Math.max(0, Math.floor((maxLen - t.length) / 2));
  const start = Math.max(0, idx - context);
  const end = Math.min(text.length, idx + t.length + context);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet;
};

const HighlightMatch = ({ text, term }: { text: string; term: string }) => {
  const t = term.trim();
  if (!t) return <>{text}</>;
  const safeTerm = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safeTerm})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === t.toLowerCase() ? (
          <mark key={i} className="bg-primary/30 text-primary rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// Notes Panel
// ─────────────────────────────────────────────

interface NotesPanelProps {
  conversationId: string;
}

const NotesPanel = ({ conversationId }: NotesPanelProps) => {
  const { data: notes = [] } = useConversationNotes(conversationId);
  const addNote = useAddConversationNote();
  const [noteText, setNoteText] = useState("");

  const handleAdd = async () => {
    if (!noteText.trim()) return;
    await addNote.mutateAsync({ conversationId, body: noteText.trim() });
    setNoteText("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border/60 rounded-md">
            Sem notas internas.
          </p>
        ) : (
          notes.map((n: any) => (
            <div key={n.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-md p-2.5">
              <p className="text-xs text-foreground whitespace-pre-wrap">{n.body}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{formatMsgDate(n.timestamp || n.created_at)}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Nota interna..."
          className="text-xs h-8"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleAdd} disabled={!noteText.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

const InboxPage = () => {
  const effectiveUserId = useEffectiveUserId();
  const [activeStatus, setActiveStatus] = useState<InboxStatus>("pending_ai");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inboxFileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global AI active status
  const { data: aiConfigData } = useQuery({
    queryKey: ["ai_config_active", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data } = await supabase.from("ai_config").select("is_active").eq("user_id", effectiveUserId).maybeSingle();
      return data;
    },
    enabled: !!effectiveUserId,
  });
  const isGlobalAIActive = aiConfigData?.is_active ?? true;

  // Fetch all conversations (no status filter) so selectedConv stays valid after status change
  const { data: allConversations = [], isLoading: loadingConvs } = useInboxConversations();
  const { data: messages = [], isLoading: loadingMsgs } = useInboxMessages(selectedConversationId || undefined);
  const { data: instances = [] } = useWhatsAppInstances();
  const updateConv = useUpdateConversation();
  const sendMessage = useSendInboxMessage();
  const markRead = useMarkConversationRead();
  const createLead = useCreateLead();
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);

  const selectedConv = allConversations.find((c) => c.id === selectedConversationId) ?? null;
  const activeInstance = instances.find((i) => i.status === "connected");

  const { data: messageMatchMap = new Map(), isFetching: searchingMessages } =
    useInboxMessageSearch(searchTerm);

  const hasSearch = searchTerm.trim().length > 0;
  const filteredConversations = allConversations.filter((c) => {
    if (!hasSearch) return c.status === activeStatus;
    const q = searchTerm.toLowerCase();
    return (
      (c.contact_name?.toLowerCase().includes(q) || false) ||
      c.contact_number.includes(q) ||
      messageMatchMap.has(c.id)
    );
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox_messages"] });
        queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMobileShowChat(true);
    // Mark as read
    const conv = allConversations.find((c) => c.id === id);
    if (conv && (conv.unread_count ?? 0) > 0) {
      markRead.mutate(id);
    }
  }, [allConversations, markRead]);

  const clearInboxFile = useCallback(() => {
    if (pendingFileUrl) URL.revokeObjectURL(pendingFileUrl);
    setPendingFile(null);
    setPendingFileUrl(null);
  }, [pendingFileUrl]);

  const handleInboxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 16 MB."); return; }
    setPendingFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPendingFileUrl(URL.createObjectURL(file));
    } else {
      setPendingFileUrl(null);
    }
    e.target.value = "";
  };

  const resolveInboxMediaType = (file: File): "image" | "video" | "audio" | "document" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleSendMessage = async () => {
    const hasText = messageText.trim().length > 0;
    const hasFile = !!pendingFile;
    if ((!hasText && !hasFile) || !selectedConv || !activeInstance) {
      if (!activeInstance) toast.error("Nenhuma instância de WhatsApp conectada.");
      return;
    }
    const currentText = messageText;
    setMessageText("");
    setUploadingFile(hasFile);
    try {
      if (hasFile) {
        const mediaType = resolveInboxMediaType(pendingFile!);
        const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
          const r = new FileReader(); r.readAsDataURL(f);
          r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej;
        });
        const base64 = await toBase64(pendingFile!);
        const filePath = `chat/${crypto.randomUUID()}-${pendingFile!.name}`;
        const { error: upErr } = await supabase.storage.from("ai-files").upload(filePath, pendingFile!);
        let publicUrl: string | undefined;
        if (!upErr) {
          const { data: { publicUrl: u } } = supabase.storage.from("ai-files").getPublicUrl(filePath);
          publicUrl = u;
        }
        await sendMessage.mutateAsync({
          conversationId: selectedConv.id,
          number: selectedConv.contact_number,
          jid: (selectedConv as any).contact_jid,
          instanceId: activeInstance.id,
          text: currentText || undefined,
          type: mediaType,
          mediaBase64: base64,
          mediaFilename: pendingFile!.name,
          mediaMimeType: pendingFile!.type,
          mediaUrl: publicUrl,
        });
        clearInboxFile();
      } else {
        await sendMessage.mutateAsync({
          conversationId: selectedConv.id,
          number: selectedConv.contact_number,
          jid: (selectedConv as any).contact_jid,
          text: currentText,
          instanceId: activeInstance.id,
          type: "text",
        });
      }
    } catch {
      toast.error("Erro ao enviar mensagem.");
      setMessageText(currentText);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenAtendimento = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: "open" });
    toast.success("Atendimento aberto.");
  };

  const handleReturnToAI = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: "pending_ai" });
    toast.success("IA reativada para esta conversa.");
  };

  const handleClose = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: "closed" });
    toast.success("Atendimento encerrado.");
  };

  const handleReopen = async () => {
    if (!selectedConv) return;
    await updateConv.mutateAsync({ id: selectedConv.id, status: "open" });
    toast.success("Atendimento reaberto.");
  };

  const handleActivateAIForConv = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from("inbox_conversations").update({ ai_enabled: true, status: "pending_ai" }).eq("id", convId);
      const { data, error } = await supabase.functions.invoke("ai-reply", { body: { conversation_id: convId } });
      if (error) throw error;
      if (data?.skipped) throw new Error(`IA não respondeu (${data.skipped}). Verifique se a função foi atualizada.`);
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox_messages", convId] });
      toast.success("IA ativada para esta conversa.");
    } catch (err: any) {
      toast.error("Erro ao ativar IA: " + (err?.message || "tente novamente"));
    }
  };

  // Quick actions directly from conversation list
  const handleQuickAssume = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateConv.mutateAsync({ id: convId, status: "open" });
    toast.success("Atendimento assumido.");
  };

  const handleQuickClose = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateConv.mutateAsync({ id: convId, status: "closed" });
    toast.success("Atendimento encerrado.");
  };

  const handleQuickReopen = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateConv.mutateAsync({ id: convId, status: "open" });
    toast.success("Atendimento reaberto.");
  };

  const handleCreateLead = () => {
    if (!selectedConv) return;
    setShowCreateLeadModal(true);
  };

  const [syncingMessages, setSyncingMessages] = useState(false);
  const handleSyncMessages = async () => {
    if (!selectedConv) return;
    setSyncingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-inbox-messages", {
        body: { conversation_id: selectedConv.id, take: 50 },
      });
      if (error) throw error;
      const inserted = data?.inserted ?? 0;
      if (inserted > 0) toast.success(`${inserted} nova(s) mensagem(ns) importada(s).`);
      else toast.info("Nenhuma mensagem nova.");
      queryClient.invalidateQueries({ queryKey: ["inbox_messages", selectedConv.id] });
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + (e?.message || "tente novamente"));
    } finally {
      setSyncingMessages(false);
    }
  };

  const handleLeadCreated = async (lead: any) => {
    if (!selectedConv) return;
    try {
      await updateConv.mutateAsync({ id: selectedConv.id, lead_id: lead.id });
      toast.success("Lead criado e vinculado!");
    } catch {
      toast.error("Lead criado, mas erro ao vincular à conversa.");
    }
  };

  const getStatusBadge = (status: InboxStatus) => {
    switch (status) {
      case "pending_ai": return null;
      case "open": return (
        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50 text-[10px] px-1.5 py-0.5">
          Em Atendimento
        </Badge>
      );
      case "closed": return (
        <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border-gray-500/50 text-[10px] px-1.5 py-0.5">
          Fechado
        </Badge>
      );
    }
  };

  const pendingCount = allConversations.filter((c) => c.status === "pending_ai").length;
  const openCount = allConversations.filter((c) => c.status === "open").length;
  const closedCount = allConversations.filter((c) => c.status === "closed").length;

  // ── Conversation list panel ──────────────────
  const ConversationList = (
    <div className="w-full flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9 bg-muted/50 border-border h-8 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { status: "pending_ai" as InboxStatus, label: "Pendentes", count: pendingCount },
          { status: "open" as InboxStatus, label: "Abertos", count: openCount },
          { status: "closed" as InboxStatus, label: "Fechados", count: closedCount },
        ] as const).map(({ status, label, count }) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 relative ${
              activeStatus === status
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                activeStatus === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {loadingConvs ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse text-sm">Carregando...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma conversa em{" "}
              {activeStatus === "pending_ai" ? "Pendentes" : activeStatus === "open" ? "Abertos" : "Fechados"}.
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full p-3 flex gap-3 text-left transition-all hover:bg-muted/50 relative group cursor-pointer ${
                  selectedConversationId === conv.id ? "bg-muted shadow-inner" : ""
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${
                  conv.status === "pending_ai" ? "bg-yellow-500" :
                  conv.status === "open" ? "bg-green-500" : "bg-gray-500"
                }`} />
                <Avatar className="w-10 h-10 border border-border/50 shrink-0">
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {conv.contact_name ? conv.contact_name.slice(0, 2).toUpperCase() : <User className="w-4 h-4 opacity-40" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-semibold text-foreground truncate text-sm max-w-[140px]">
                      {conv.contact_name || conv.contact_number}
                    </h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
                      {formatConvDate(conv.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1.5">
                    {(() => {
                      const matchedBody = messageMatchMap.get(conv.id);
                      if (matchedBody) {
                        return (
                          <span className="text-foreground/80">
                            <HighlightMatch text={getMatchSnippet(matchedBody, searchTerm)} term={searchTerm} />
                          </span>
                        );
                      }
                      return conv.last_message || "Nenhuma mensagem";
                    })()}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(conv.status)}
                      {(isGlobalAIActive || conv.ai_enabled) ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-green-500/10 text-green-500 border border-green-500/30 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" /> IA ativa
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-destructive/10 text-destructive border border-destructive/30 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" /> IA desativada
                        </span>
                      )}
                    </div>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] font-bold shadow-glow">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Quick action buttons — visible on hover */}
                  <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {conv.status === "pending_ai" && !isGlobalAIActive && !conv.ai_enabled && (
                      <button
                        onClick={(e) => handleActivateAIForConv(conv.id, e)}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                      >
                        Ativar IA
                      </button>
                    )}
                    {conv.status === "pending_ai" && (
                      <>
                        <button
                          onClick={(e) => handleQuickAssume(conv.id, e)}
                          className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                        >
                          Assumir
                        </button>
                        <button
                          onClick={(e) => handleQuickClose(conv.id, e)}
                          className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors"
                        >
                          Encerrar
                        </button>
                      </>
                    )}
                    {conv.status === "open" && (
                      <button
                        onClick={(e) => handleQuickClose(conv.id, e)}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors"
                      >
                        Encerrar
                      </button>
                    )}
                    {conv.status === "closed" && (
                      <button
                        onClick={(e) => handleQuickReopen(conv.id, e)}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ── Chat panel ───────────────────────────────
  const ChatPanel = (
    <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
      {selectedConv ? (
        <>
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20 backdrop-blur-sm z-10 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back */}
              <button
                className="lg:hidden p-1 -ml-1 rounded-md hover:bg-muted text-muted-foreground"
                onClick={() => setMobileShowChat(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Avatar className="w-8 h-8 ring-2 ring-primary/20 shrink-0">
                <AvatarFallback className="text-xs">
                  {selectedConv.contact_name ? selectedConv.contact_name.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5 text-primary" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="font-bold text-foreground text-sm leading-tight truncate">
                  {selectedConv.contact_name || selectedConv.contact_number}
                </h2>
                <p className="text-[11px] text-muted-foreground">{selectedConv.contact_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedConv.lead_id ? (
                <Button
                  variant="outline" size="sm" className="text-cyan-400 border-cyan-400/30 bg-cyan-400/5 hover:bg-cyan-400/10 h-7 text-xs"
                  onClick={() => navigate(`/leads?open=${selectedConv.lead_id}`)}
                >
                  Ver Lead
                </Button>
              ) : (
                <Button
                  variant="outline" size="sm" className="border-dashed h-7 text-xs"
                  onClick={handleCreateLead}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Criar Lead
                </Button>
              )}

              {selectedConv.status === "open" && (
                <>
                  <Button
                    onClick={handleReturnToAI} size="sm"
                    className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border border-yellow-500/50 h-7 text-xs hidden sm:flex"
                    variant="outline"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Para IA
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClose} className="h-7 text-xs hidden sm:flex">
                    Encerrar
                  </Button>
                </>
              )}
              {selectedConv.status === "pending_ai" && (
                <>
                  <Button
                    onClick={handleOpenAtendimento} size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs hidden sm:flex"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Assumir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClose} className="h-7 text-xs hidden sm:flex">
                    Encerrar
                  </Button>
                </>
              )}
              {selectedConv.status === "closed" && (
                <Button
                  onClick={handleReopen} size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white h-7 text-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Abrir
                </Button>
              )}

              {/* Sync messages from Evolution */}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleSyncMessages}
                disabled={syncingMessages}
                title="Recarregar mensagens do WhatsApp"
              >
                {syncingMessages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>

              {/* Notes toggle */}
              <Button
                variant={showNotes ? "default" : "outline"}
                size="icon"
                className="h-7 w-7"
                onClick={() => { setShowNotes((v) => !v); setShowInfoPanel(false); }}
                title="Notas internas"
              >
                <StickyNote className="w-3.5 h-3.5" />
              </Button>

              {/* Info / lead panel toggle */}
              <Button
                variant={showInfoPanel ? "default" : "outline"}
                size="icon"
                className="h-7 w-7"
                onClick={() => { setShowInfoPanel((v) => !v); setShowNotes(false); }}
                title="Informações do contato"
              >
                <User className="w-3.5 h-3.5" />
              </Button>

              {/* Mobile overflow actions */}
              {(selectedConv.status === "open" || selectedConv.status === "pending_ai" || selectedConv.status === "closed") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7 sm:hidden">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedConv.status === "open" && (
                      <>
                        <DropdownMenuItem onClick={handleReturnToAI}>
                          <Play className="w-4 h-4 mr-2 text-yellow-500" /> Voltar para IA
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleClose} className="text-destructive">
                          Encerrar atendimento
                        </DropdownMenuItem>
                      </>
                    )}
                    {selectedConv.status === "pending_ai" && (
                      <>
                        <DropdownMenuItem onClick={handleOpenAtendimento}>
                          <Play className="w-4 h-4 mr-2 text-green-500" /> Assumir atendimento
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleClose} className="text-destructive">
                          Encerrar atendimento
                        </DropdownMenuItem>
                      </>
                    )}
                    {selectedConv.status === "closed" && (
                      <DropdownMenuItem onClick={handleReopen}>
                        <Play className="w-4 h-4 mr-2 text-blue-500" /> Reabrir atendimento
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Notes panel (below header, collapsible) */}
          {showNotes && (
            <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
              <p className="text-xs font-semibold text-yellow-600 mb-2 flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5" /> Notas Internas
              </p>
              <NotesPanel conversationId={selectedConv.id} />
            </div>
          )}

          {/* Info panel (below header, collapsible) */}
          {showInfoPanel && (
            <div className="border-b border-border bg-muted/10 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Informações do Contato
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium text-foreground">{selectedConv.contact_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Número</p>
                  <p className="font-medium text-foreground">{selectedConv.contact_number}</p>
                </div>
              </div>
              {selectedConv.lead_id && (
                <Button
                  variant="outline" size="sm"
                  className="w-full text-xs h-7 border-cyan-400/30 text-cyan-400 bg-cyan-400/5 hover:bg-cyan-400/10"
                  onClick={() => navigate(`/leads?id=${selectedConv.lead_id}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir lead no Kanban
                </Button>
              )}
              {(selectedConv as any).leads && (
                <div className="bg-muted/40 border border-border rounded-md p-2 text-xs space-y-1">
                  <p className="text-muted-foreground">Status do lead</p>
                  <p className="font-medium text-foreground">{(selectedConv as any).leads?.status || "—"}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 text-sm">Nenhuma mensagem ainda.</div>
              ) : (
                messages.map((msg) => {
                  const isNote = (msg as any).is_note;
                  if (isNote) return null; // notes shown in panel
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm relative shadow-sm ${
                        msg.direction === "outbound"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border border-border/50"
                      }`}>
                        <MediaBubble m={msg as any} />
                        <div className={`flex items-center gap-1 mt-0.5 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <span className="text-[9px] opacity-60">
                            {formatMsgDate(msg.timestamp || msg.created_at)}
                          </span>
                          {msg.direction === "outbound" && (
                            <Check className="w-2.5 h-2.5 opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border bg-muted/10">
            {/* Pending file chip */}
            {pendingFile && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5 text-xs mb-2">
                {pendingFileUrl && pendingFile.type.startsWith("image/") ? (
                  <img src={pendingFileUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <span className="truncate flex-1 text-foreground">{pendingFile.name}</span>
                <button onClick={clearInboxFile} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              {/* Quick replies */}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setShowQuickReplies(true)}
                title="Respostas rápidas"
              >
                <Zap className="w-4 h-4 text-primary" />
              </Button>
              {/* Attach file */}
              <input
                ref={inboxFileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                onChange={handleInboxFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                onClick={() => inboxFileInputRef.current?.click()}
                disabled={uploadingFile || sendMessage.isPending}
                title="Anexar arquivo"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <EmojiPickerButton
                variant="outline"
                disabled={uploadingFile || sendMessage.isPending}
                onSelect={(emoji) => setMessageText((prev) => prev + emoji)}
              />
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={pendingFile ? "Adicionar legenda (opcional)..." : "Escreva sua mensagem..."}
                className="flex-1 bg-background border-border resize-none text-sm min-h-[36px] max-h-28 py-2"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 shadow-glow"
                onClick={handleSendMessage}
                disabled={uploadingFile || sendMessage.isPending || (!messageText.trim() && !pendingFile)}
              >
                {(uploadingFile || sendMessage.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 ml-1">Enter envia · Shift+Enter nova linha · Máx 16 MB</p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
          <MessageSquare className="w-14 h-14 mb-4 text-primary" />
          <h3 className="text-lg font-bold mb-2">Selecione um chat</h3>
          <p className="max-w-[240px] text-sm">Escolha uma conversa na lista lateral para começar.</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
        <header className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <InboxIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Inbox</h1>
          </div>
        </header>

        {/* Desktop: side by side | Mobile: one panel at a time */}
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Conversation list — hidden on mobile when chat is open */}
          <div className={`${mobileShowChat ? "hidden lg:flex" : "flex"} flex-col lg:w-[38%] w-full`}>
            {ConversationList}
          </div>

          {/* Chat panel — hidden on mobile when list is shown */}
          <div className={`${mobileShowChat ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0`}>
            {ChatPanel}
          </div>
        </div>
      </div>

      <QuickRepliesModal
        open={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        onSelect={(body) => setMessageText(body)}
      />

      <LeadModal
        open={showCreateLeadModal}
        onOpenChange={setShowCreateLeadModal}
        prefillNome={selectedConv?.contact_name || (selectedConv?.contact_number ? `Contato ${selectedConv.contact_number}` : "")}
        prefillWhatsapp={selectedConv?.contact_number || ""}
        onCreated={handleLeadCreated}
      />
    </>
  );
};

export default InboxPage;
