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
      
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
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

export const useSendInboxMessage = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ conversationId, number, text, instanceId }: { conversationId: string; number: string; text: string; instanceId: string }) => {
      // 1. Send via Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          instance_id: instanceId,
          type: 'text',
          content: text,
          lead_id: null, // We'll handle internal linking or pass lead_id if exists
          sent_by: 'human'
        }
      });

      if (functionError) throw functionError;

      // 2. Save locally in inbox_messages (the edge function might save to 'messages' table, but we need 'inbox_messages')
      // Note: In a real sync, the webhook would bring this back, but for UI responsiveness we can insert or let webhook handle it.
      // Based on specs, we insert manually here.
      const { error: insertError } = await supabase
        .from("inbox_messages")
        .insert({
          conversation_id: conversationId,
          user_id: effectiveUserId!,
          body: text,
          direction: 'outbound',
          read: true
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
