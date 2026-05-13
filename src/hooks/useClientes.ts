import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import { normalizeText } from "@/lib/utils";

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
  meta_ad_account_id?: string | null;
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
  meta_ad_account_id?: string | null;
}

export const useClientes = (search?: string) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["clientes", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Cliente[];
    },
    enabled: !!effectiveUserId,
    select: (data) => {
      if (!search || !search.trim()) return data;
      const q = normalizeText(search);
      return data.filter((c) =>
        normalizeText(c.nome).includes(q) ||
        normalizeText(c.email).includes(q) ||
        normalizeText(c.whatsapp).includes(q)
      );
    },
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
