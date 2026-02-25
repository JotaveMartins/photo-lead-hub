import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export const useMessages = (leadId?: string) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["messages", effectiveUserId, leadId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      let query = supabase
        .from("messages")
        .select("*, leads(nome)")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (leadId) {
        query = query.eq("lead_id", leadId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (message: Omit<MessageInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("messages")
        .insert({ ...message, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Mensagem registrada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar mensagem: " + error.message);
    },
  });
};
