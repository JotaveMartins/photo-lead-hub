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
        .select("*, clientes(nome), services(nome)")
        .eq("user_id", effectiveUserId)
        .order("data_evento", { ascending: true });

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

export const useDeleteEvent = () => {
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
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });
};
