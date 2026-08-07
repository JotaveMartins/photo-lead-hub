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
  lead_id: string | null;
  cliente_id: string | null;
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
        .select("*, leads(nome, whatsapp), clientes(nome, whatsapp)")
        .eq("user_id", effectiveUserId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } | null; clientes: { nome: string; whatsapp: string } | null })[];
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
        .select("*, leads(nome, whatsapp), clientes(nome, whatsapp)")
        .eq("user_id", effectiveUserId)
        .eq("completed", false)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; whatsapp: string } | null; clientes: { nome: string; whatsapp: string } | null })[];
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
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Tarefa marcada como concluída", {
        duration: 4000,
        position: "bottom-left",
        action: {
          label: "Desfazer",
          onClick: async () => {
            const { error } = await supabase
              .from("lead_tasks")
              .update({ completed: false, completed_at: null })
              .eq("id", task.id);
            if (error) {
              toast.error("Erro ao desfazer: " + error.message);
              return;
            }
            queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success("Tarefa reaberta");
          },
        },
      });
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
    mutationFn: async (task: { lead_id?: string | null; cliente_id?: string | null; title: string; description?: string; due_date: string; due_time?: string }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      if (!task.lead_id && !task.cliente_id) throw new Error("Vincule a tarefa a um lead ou cliente");
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert({
          lead_id: task.lead_id || null,
          cliente_id: task.cliente_id || null,
          user_id: effectiveUserId,
          title: task.title,
          description: task.description || null,
          due_date: task.due_date,
          due_time: task.due_time || null,
          is_cadence: false,
          task_number: 0,
        } as any)
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

// Tarefas de um cliente específico
export const useClienteTasks = (clienteId: string | undefined) => {
  return useQuery({
    queryKey: ["lead_tasks", "cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [] as LeadTask[];
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as LeadTask[];
    },
    enabled: !!clienteId,
  });
};

// Tarefas de cliente vencendo até hoje (para sininho/badge)
export const useTodayClienteTasks = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["lead_tasks", "cliente_today", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const todayStr = getLocalDateStr();
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, clientes(nome)")
        .eq("user_id", effectiveUserId)
        .eq("completed", false)
        .not("cliente_id", "is", null)
        .lte("due_date", todayStr)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as (LeadTask & { clientes: { nome: string } | null })[];
    },
    enabled: !!effectiveUserId,
  });
};

// Mapa cliente_id -> { atrasadas, hoje, futuras } (apenas pendentes)
export const useClienteTaskCounts = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["lead_tasks", "cliente_counts", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return {} as Record<string, { atrasadas: number; hoje: number; futuras: number }>;
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("cliente_id, due_date")
        .eq("user_id", effectiveUserId)
        .eq("completed", false)
        .not("cliente_id", "is", null);
      if (error) throw error;
      const todayStr = getLocalDateStr();
      const map: Record<string, { atrasadas: number; hoje: number; futuras: number }> = {};
      (data || []).forEach((t: any) => {
        const id = t.cliente_id as string;
        if (!map[id]) map[id] = { atrasadas: 0, hoje: 0, futuras: 0 };
        if (t.due_date < todayStr) map[id].atrasadas++;
        else if (t.due_date === todayStr) map[id].hoje++;
        else map[id].futuras++;
      });
      return map;
    },
    enabled: !!effectiveUserId,
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
