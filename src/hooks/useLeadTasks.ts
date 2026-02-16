import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LeadTask {
  id: string;
  lead_id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_number: number;
  due_date: string;
  due_time: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  is_cadence: boolean;
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

export const useAllTasks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead_tasks", "all", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, leads(nome, whatsapp)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } })[];
    },
    enabled: !!user,
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

export const useTasksByLeadIds = (leadIds: string[]) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead_tasks", "by_leads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("completed", false);
      if (error) throw error;
      return data as LeadTask[];
    },
    enabled: !!user && leadIds.length > 0,
  });
};

export const useCompleteLeadTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: LeadTask) => {
      const { error } = await supabase
        .from("lead_tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;

      // Auto-generate next cadence task
      if (task.is_cadence && task.task_number < 5 && user) {
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
            is_cadence: true,
          });
        if (insertError) throw insertError;
      }

      if (task.is_cadence && task.task_number === 5 && user) {
        const { error: insertError } = await supabase
          .from("lead_tasks")
          .insert({
            lead_id: task.lead_id,
            user_id: user.id,
            title: "Mover para Fechado Perdido",
            task_number: 6,
            due_date: new Date().toISOString().split("T")[0],
            is_cadence: true,
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

export const useUncompleteLeadTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("lead_tasks")
        .update({ completed: false, completed_at: null })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Tarefa reaberta!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao reabrir tarefa: " + error.message);
    },
  });
};

export const useUpdateLeadTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string | null; due_date?: string; due_time?: string | null }) => {
      const { error } = await supabase
        .from("lead_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Tarefa atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar tarefa: " + error.message);
    },
  });
};

export const useCreateLeadTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: { lead_id: string; title: string; description?: string; due_date: string; due_time?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert({
          lead_id: task.lead_id,
          user_id: user.id,
          title: task.title,
          description: task.description || null,
          due_date: task.due_date,
          due_time: task.due_time || null,
          is_cadence: false,
          task_number: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Tarefa criada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar tarefa: " + error.message);
    },
  });
};
