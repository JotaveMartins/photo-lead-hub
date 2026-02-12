import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Service {
  id: string;
  user_id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  valor_base: number;
  custo_interno: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceInsert {
  nome: string;
  categoria: string;
  descricao?: string | null;
  valor_base: number;
  custo_interno?: number | null;
  ativo?: boolean;
}

export const useServices = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user,
  });
};

export const useServiceCategories = () => {
  const { data: services = [] } = useServices();
  const categories = [...new Set(services.map((s) => s.categoria).filter(Boolean))];
  return categories;
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (service: ServiceInsert) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("services")
        .insert({ ...service, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar serviço: " + error.message);
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...service }: Partial<ServiceInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("services")
        .update(service)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar serviço: " + error.message);
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir serviço: " + error.message);
    },
  });
};
