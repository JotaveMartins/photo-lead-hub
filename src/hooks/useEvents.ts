import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export const useEvents = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["events", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("events")
        .select("*, clientes(nome, whatsapp), services(nome)")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("data_evento", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};

export const useDeletedEvents = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["events-deleted", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("events")
        .select("*, clientes(nome, whatsapp), services(nome)")
        .eq("user_id", effectiveUserId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (event: {
      titulo: string;
      tipo?: string;
      data_evento: string;
      descricao?: string | null;
      local?: string | null;
      cliente_id?: string | null;
      service_id?: string | null;
      lead_id?: string | null;
    }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("events")
        .insert({
          titulo: event.titulo,
          tipo: event.tipo || "Evento",
          data_evento: event.data_evento,
          descricao: event.descricao || null,
          local: event.local || null,
          cliente_id: event.cliente_id || null,
          service_id: event.service_id || null,
          lead_id: event.lead_id || null,
          user_id: effectiveUserId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...event }: {
      id: string;
      titulo?: string;
      tipo?: string;
      data_evento?: string;
      descricao?: string | null;
      local?: string | null;
      cliente_id?: string | null;
      service_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("events")
        .update(event as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar evento: " + error.message);
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-deleted"] });
      toast.success("Evento movido para a lixeira!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });
};

export const useRestoreEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .update({ deleted_at: null } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-deleted"] });
      toast.success("Evento restaurado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao restaurar evento: " + error.message);
    },
  });
};

export const usePermanentDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-deleted"] });
      toast.success("Evento excluído permanentemente!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });
};
