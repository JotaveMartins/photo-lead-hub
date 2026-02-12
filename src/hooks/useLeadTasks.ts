import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LeadTask {
  id: string;
  lead_id: string;
  user_id: string;
  title: string;
  task_number: number;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export const useLeadTasks = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ["lead_tasks", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("lead_id", leadId)
        .order("task_number", { ascending: true });
      if (error) throw error;
      return data as LeadTask[];
    },
    enabled: !!leadId,
  });
};

export const useAllPendingTasks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead_tasks", "all_pending", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, leads(nome, whatsapp)")
        .eq("completed", false)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } })[];
    },
    enabled: !!user,
  });
};

export const useCompleteLeadTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: LeadTask) => {
      // Mark current task as completed
      const { error } = await supabase
        .from("lead_tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;

      // If task_number < 5, create next task for tomorrow
      if (task.task_number < 5 && user) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextNumber = task.task_number + 1;
        const { error: insertError } = await supabase
          .from("lead_tasks")
          .insert({
            lead_id: task.lead_id,
            user_id: user.id,
            title: `Entrar em contato (${nextNumber}ª tentativa)`,
            task_number: nextNumber,
            due_date: tomorrow.toISOString().split("T")[0],
          });
        if (insertError) throw insertError;
      }

      // If task_number === 5, create a "move to lost" task
      if (task.task_number === 5 && user) {
        const { error: insertError } = await supabase
          .from("lead_tasks")
          .insert({
            lead_id: task.lead_id,
            user_id: user.id,
            title: "Mover para Fechado Perdido",
            task_number: 6,
            due_date: new Date().toISOString().split("T")[0],
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Tarefa concluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao concluir tarefa: " + error.message);
    },
  });
};
