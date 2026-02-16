import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeadHistoryEntry {
  id: string;
  lead_id: string;
  user_id: string;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const useLeadHistory = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ["lead_history", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadHistoryEntry[];
    },
    enabled: !!leadId,
  });
};

export const useCreateLeadHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: { lead_id: string; field_name: string; field_label: string; old_value: string | null; new_value: string | null }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("lead_history")
        .insert({ ...entry, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_history"] });
    },
  });
};
