import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

export const useEvents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("events")
        .select("*, leads(nome)")
        .order("data_evento", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<EventInsert, "user_id">) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("events")
        .insert({ ...event, user_id: user.id })
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
