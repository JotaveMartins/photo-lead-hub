import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type InboxStatus = 'pending_ai' | 'open' | 'closed';

export const useInboxConversations = (status?: InboxStatus) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["inbox_conversations", effectiveUserId, status],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      let query = supabase
        .from("inbox_conversations")
        .select("*, leads(nome, status)")
        .eq("user_id", effectiveUserId)
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};

export const useInboxMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ["inbox_messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      // Order by created_at (always set) — `timestamp` can be null for AI/webhook messages
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
    // Fallback polling in case realtime isn't delivering (e.g. table not in publication)
    refetchInterval: 5000,
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: InboxStatus; lead_id?: string | null; assigned_to?: string | null }) => {
      const { data, error } = await supabase
        .from("inbox_conversations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
    },
  });
};

export interface SendInboxMessageParams {
  conversationId: string;
  number: string;
  instanceId: string;
  text?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaBase64?: string;
  mediaFilename?: string;
  mediaMimeType?: string;
  mediaUrl?: string;
}

export const useSendInboxMessage = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    onMutate: async (newMessage: SendInboxMessageParams) => {
      await queryClient.cancelQueries({ queryKey: ["inbox_messages", newMessage.conversationId] });
      await queryClient.cancelQueries({ queryKey: ["inbox_conversations"] });

      const previousMessages = queryClient.getQueryData<any[]>(["inbox_messages", newMessage.conversationId]);
      const previousConversations = queryClient.getQueryData<any[]>(["inbox_conversations"]);

      const msgType = newMessage.type || 'text';
      const displayBody = newMessage.text || (msgType !== 'text' ? `[${msgType}]` : '');

      queryClient.setQueryData<any[]>(["inbox_messages", newMessage.conversationId], (old = []) => [
        ...old,
        {
          id: Math.random().toString(36).substring(7),
          conversation_id: newMessage.conversationId,
          body: displayBody,
          direction: 'outbound',
          timestamp: new Date().toISOString(),
          read: true,
          type: msgType,
          media_url: newMessage.mediaUrl || null,
          media_filename: newMessage.mediaFilename || null,
          media_mime_type: newMessage.mediaMimeType || null,
        }
      ]);

      queryClient.setQueryData<any[]>(["inbox_conversations"], (old = []) =>
        old.map(conv => conv.id === newMessage.conversationId
          ? { ...conv, last_message: displayBody, status: 'open', updated_at: new Date().toISOString() }
          : conv
        )
      );

      return { previousMessages, previousConversations };
    },
    onError: (err, newMessage, context: any) => {
      queryClient.setQueryData(["inbox_messages", newMessage.conversationId], context?.previousMessages);
      queryClient.setQueryData(["inbox_conversations"], context?.previousConversations);
      toast.error("Erro ao enviar mensagem.");
    },
    mutationFn: async (params: SendInboxMessageParams) => {
      const msgType = params.type || 'text';
      const { data, error: functionError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          instance_id: params.instanceId,
          phone_number: params.number,
          type: msgType,
          content: params.text || '',
          media_base64: params.mediaBase64 || undefined,
          media_filename: params.mediaFilename || undefined,
          media_mime_type: params.mediaMimeType || undefined,
          lead_id: null,
          sent_by: 'human',
        }
      });

      if (functionError) throw functionError;

      const { error: insertError } = await supabase
        .from("inbox_messages")
        .insert({
          conversation_id: params.conversationId,
          user_id: effectiveUserId!,
          body: params.text || null,
          direction: 'outbound',
          read: true,
          type: msgType,
          media_url: params.mediaUrl || null,
          media_filename: params.mediaFilename || null,
          media_mime_type: params.mediaMimeType || null,
        });

      if (insertError) throw insertError;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inbox_messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
    },
  });
};

export const useInboxTriggers = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["inbox_triggers", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("inbox_triggers")
        .select("*")
        .eq("user_id", effectiveUserId);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateInboxTrigger = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (keyword: string) => {
      const { data, error } = await supabase
        .from("inbox_triggers")
        .insert({ keyword, user_id: effectiveUserId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox_triggers"] });
      toast.success("Trigger criado com sucesso!");
    },
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inbox_conversations")
        .update({ unread_count: 0 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox_conversations"] });
    },
  });
};

export const useInboxTotalUnread = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["inbox_total_unread", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return 0;
      const { data } = await supabase
        .from("inbox_conversations")
        .select("unread_count")
        .eq("user_id", effectiveUserId)
        .neq("status", "closed");
      return (data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
    },
    enabled: !!effectiveUserId,
    refetchInterval: 30_000,
  });
};

export const useConversationNotes = (conversationId?: string) => {
  return useQuery({
    queryKey: ["inbox_notes", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await (supabase as any)
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("is_note", true)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });
};

export const useAddConversationNote = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const { error } = await supabase.from("inbox_messages").insert({
        conversation_id: conversationId,
        user_id: effectiveUserId!,
        body,
        direction: "outbound",
        read: true,
        is_note: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["inbox_notes", conversationId] });
      toast.success("Nota interna salva.");
    },
  });
};
