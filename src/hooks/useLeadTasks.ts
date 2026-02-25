import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

// Helper to get today's date string in local timezone (YYYY-MM-DD)
const getLocalDateStr = (offsetDays = 0): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  if (offsetDays !== 0) now.setDate(now.getDate() + offsetDays);
  return now.toISOString().slice(0, 10);
};

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
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["lead_tasks", "all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, leads(nome, whatsapp)")
        .eq("user_id", effectiveUserId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } })[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useAllPendingTasks = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["lead_tasks", "all_pending", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, leads(nome, whatsapp)")
        .eq("user_id", effectiveUserId)
        .eq("completed", false)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } })[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useTasksByLeadIds = (leadIds: string[]) => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["lead_tasks", "by_leads", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("completed", false);
      if (error) throw error;
      return data as LeadTask[];
    },
    enabled: !!effectiveUserId && leadIds.length > 0,
  });
};

export const useCompleteLeadTask = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (task: LeadTask): Promise<{ isFollowUp: boolean; followUpNumber: number }> => {
      const { error } = await supabase
        .from("lead_tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;

      const isFollowUp = task.title.startsWith("Follow-up");
      if (isFollowUp) {
        const match = task.title.match(/Follow-up\s+(\d+)/);
        const currentNum = match ? parseInt(match[1]) : 1;
        if (currentNum >= 1 && currentNum <= 5) {
          const fieldName = `follow_up_${currentNum}` as string;
          const todayStr = getLocalDateStr();
          await supabase.from("leads").update({ [fieldName]: todayStr } as any).eq("id", task.lead_id);
        }
        return { isFollowUp: true, followUpNumber: currentNum + 1 };
      }

      if (task.is_cadence && task.task_number >= 1 && task.task_number <= 5) {
        const fieldName = `cadencia_${task.task_number}` as string;
        await supabase.from("leads").update({ [fieldName]: new Date().toISOString() } as any).eq("id", task.lead_id);
      }

      if (task.is_cadence && task.task_number < 5 && effectiveUserId) {
        const nextNumber = task.task_number + 1;
        const { data: existing } = await supabase
          .from("lead_tasks")
          .select("id")
          .eq("lead_id", task.lead_id)
          .eq("is_cadence", true)
          .eq("task_number", nextNumber)
          .maybeSingle();
        if (!existing) {
          const tomorrowStr = getLocalDateStr(1);
          const { error: insertError } = await supabase
            .from("lead_tasks")
            .insert({
              lead_id: task.lead_id,
              user_id: effectiveUserId,
              title: `${nextNumber}º Entrar em contato`,
              task_number: nextNumber,
              due_date: tomorrowStr,
              is_cadence: true,
            });
          if (insertError) throw insertError;
        }
      }

      if (task.is_cadence && task.task_number === 5 && effectiveUserId) {
        const { data: existing } = await supabase
          .from("lead_tasks")
          .select("id")
          .eq("lead_id", task.lead_id)
          .eq("is_cadence", true)
          .eq("task_number", 6)
          .maybeSingle();
        if (!existing) {
          const todayStr = getLocalDateStr();
          const { error: insertError } = await supabase
            .from("lead_tasks")
            .insert({
              lead_id: task.lead_id,
              user_id: effectiveUserId,
              title: "Mover para Fechado Perdido",
              task_number: 6,
              due_date: todayStr,
              is_cadence: true,
            });
          if (insertError) throw insertError;
        }
      }

      return { isFollowUp: false, followUpNumber: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Tarefa concluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao concluir tarefa: " + error.message);
    },
  });
};

export const useCreateFollowUpTask = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ leadId, followUpNumber, dueDate }: { leadId: string; followUpNumber: number; dueDate: string }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("lead_tasks")
        .insert({
          lead_id: leadId,
          user_id: effectiveUserId,
          title: `Follow-up ${followUpNumber}`,
          task_number: followUpNumber,
          due_date: dueDate,
          is_cadence: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Follow-up criado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar follow-up: " + error.message);
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
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (task: { lead_id: string; title: string; description?: string; due_date: string; due_time?: string }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert({
          lead_id: task.lead_id,
          user_id: effectiveUserId,
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

export const useDeleteLeadTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("lead_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      toast.success("Tarefa excluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir tarefa: " + error.message);
    },
  });
};
