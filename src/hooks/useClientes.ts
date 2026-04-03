import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  origem: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteInsert {
  user_id: string;
  nome: string;
  email?: string | null;
  whatsapp?: string | null;
  cpf_cnpj?: string | null;
  endereco?: string | null;
  origem?: string | null;
  observacoes?: string | null;
}

export const useClientes = (search?: string) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["clientes", effectiveUserId, search],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from("clientes")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`nome.ilike.${s},email.ilike.${s},whatsapp.ilike.${s}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Cliente[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClienteInsert) => {
      const { data: result, error } = await supabase
        .from("clientes")
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente cadastrado com sucesso!");
    },
  });
};

export const useUpdateCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ClienteInsert>) => {
      const { data: result, error } = await supabase
        .from("clientes")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente atualizado!");
    },
  });
};

export const useDeleteCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente excluído!");
    },
  });
};
