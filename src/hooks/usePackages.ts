import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Package = Database["public"]["Tables"]["packages"]["Row"];

export const usePackages = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["packages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("is_default", { ascending: false })
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Package[];
    },
    enabled: !!user,
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
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Pacote excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir pacote: " + error.message);
    },
  });
};
