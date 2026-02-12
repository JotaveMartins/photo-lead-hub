import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const useLeadNotes = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ["lead_notes", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LeadNote[];
    },
    enabled: !!leadId,
  });
};

export const useCreateLeadNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lead_id, content }: { lead_id: string; content: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("lead_notes")
        .insert({ lead_id, content, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lead_notes", variables.lead_id] });
      toast.success("Nota adicionada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar nota: " + error.message);
    },
  });
};

export const useDeleteLeadNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", id);
      if (error) throw error;
      return lead_id;
    },
    onSuccess: (lead_id) => {
      queryClient.invalidateQueries({ queryKey: ["lead_notes", lead_id] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir nota: " + error.message);
    },
  });
};
