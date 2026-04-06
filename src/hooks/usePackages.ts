import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Package = Database["public"]["Tables"]["packages"]["Row"];

export const usePackages = () => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["packages", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .or(`user_id.eq.${effectiveUserId},is_default.eq.true`)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Package[];
    },
    enabled: !!user && !!effectiveUserId,
  });
};

export const useDeletedPackages = () => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["packages-deleted", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as Package[];
    },
    enabled: !!user && !!effectiveUserId,
  });
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (nome: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("packages")
        .insert({ nome, user_id: user.id, is_default: false })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Pacote criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar pacote: " + error.message);
    },
  });
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("packages")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["packages-deleted"] });
      toast.success("Pacote movido para a lixeira!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir pacote: " + error.message);
    },
  });
};

export const useRestorePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("packages")
        .update({ deleted_at: null } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["packages-deleted"] });
      toast.success("Pacote restaurado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao restaurar pacote: " + error.message);
    },
  });
};

export const usePermanentDeletePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages-deleted"] });
      toast.success("Pacote excluído permanentemente!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir pacote: " + error.message);
    },
  });
};
