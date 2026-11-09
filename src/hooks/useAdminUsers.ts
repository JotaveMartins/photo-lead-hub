import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const rows: Tables<"profiles">[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("profiles").select("*")
          .order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) return rows;
      }
    },
  });

  const createUser = useMutation({
    mutationFn: async ({ nome, email, planoBasico }: { nome: string; email: string; planoBasico?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("create-user", {
        body: { nome, email, plano_basico: !!planoBasico },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-crm-access"] });
      queryClient.invalidateQueries({ queryKey: ["admin-account-segments"] });
      queryClient.invalidateQueries({ queryKey: ["usage-metrics"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const response = await supabase.functions.invoke("delete-user", {
        body: { user_id },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-crm-access"] });
      queryClient.invalidateQueries({ queryKey: ["admin-account-segments"] });
      queryClient.invalidateQueries({ queryKey: ["usage-metrics"] });
    },
  });

  return { users, isLoading, error, refetch, createUser, deleteUser };
};
