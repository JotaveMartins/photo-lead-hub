import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
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
  deleted_at?: string | null;
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
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["services", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user && !!effectiveUserId,
  });
};

export const useDeletedServices = () => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["services-deleted", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user && !!effectiveUserId,
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
      const { error } = await supabase
        .from("services")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services-deleted"] });
      toast.success("Serviço movido para a lixeira!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir serviço: " + error.message);
    },
  });
};

export const useRestoreService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .update({ deleted_at: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services-deleted"] });
      toast.success("Serviço restaurado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao restaurar serviço: " + error.message);
    },
  });
};

export const usePermanentDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-deleted"] });
      toast.success("Serviço excluído permanentemente!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir serviço: " + error.message);
    },
  });
};
