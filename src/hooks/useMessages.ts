import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export const useMessages = (leadId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", user?.id, leadId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("messages")
        .select("*, leads(nome)")
        .order("created_at", { ascending: false });

      if (leadId) {
        query = query.eq("lead_id", leadId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (message: Omit<MessageInsert, "user_id">) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("messages")
        .insert({ ...message, user_id: user.id })
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
