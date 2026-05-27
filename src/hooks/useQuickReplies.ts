import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export interface QuickReply {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export const useQuickReplies = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["quick_replies", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [] as QuickReply[];
      const { data, error } = await supabase
        .from("inbox_quick_replies" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("title");
      if (error) throw error;
      return ((data as any) || []) as QuickReply[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateQuickReply = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  return useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      const { data, error } = await supabase
        .from("inbox_quick_replies" as any)
        .insert({ title, body, user_id: effectiveUserId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_replies"] });
      toast.success("Resposta rápida criada!");
    },
  });
};

export const useDeleteQuickReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inbox_quick_replies" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_replies"] });
      toast.success("Resposta rápida excluída.");
    },
  });
};
