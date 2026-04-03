import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export type DespesaStatus = "paga" | "prevista";
export type PaymentMethod = "pix" | "cartao" | "boleto" | "transferencia" | "dinheiro";

export interface Despesa {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  forma_pagamento: PaymentMethod;
  status: DespesaStatus;
  evento_id: string | null;
  observacoes: string | null;
  parcela_numero: number | null;
  parcela_total: number | null;
  grupo_id: string | null;
  recorrente: boolean;
  created_at: string;
  updated_at: string;
}

export interface DespesaInsert {
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  forma_pagamento?: PaymentMethod;
  status?: DespesaStatus;
  evento_id?: string | null;
  observacoes?: string | null;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  grupo_id?: string | null;
  recorrente?: boolean;
}

export const useDespesas = (month?: Date) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["despesas", effectiveUserId, month?.toISOString()],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      let query = supabase
        .from("despesas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("data", { ascending: false });

      if (month) {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        query = query
          .gte("data", start.toISOString().split("T")[0])
          .lte("data", end.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Despesa[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useAllDespesas = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["despesas-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data || []) as Despesa[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateDespesa = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (despesa: DespesaInsert) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("despesas")
        .insert({ ...despesa, user_id: effectiveUserId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      queryClient.invalidateQueries({ queryKey: ["despesas-all"] });
      toast.success("Despesa criada com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao criar despesa: " + err.message),
  });
};

export const useCreateDespesasBatch = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (despesas: DespesaInsert[]) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const rows = despesas.map((d) => ({ ...d, user_id: effectiveUserId }));
      const { data, error } = await supabase
        .from("despesas")
        .insert(rows as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      queryClient.invalidateQueries({ queryKey: ["despesas-all"] });
      toast.success("Despesas criadas com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao criar despesas: " + err.message),
  });
};

export const useUpdateDespesa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Despesa> & { id: string }) => {
      const { data, error } = await supabase
        .from("despesas")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      queryClient.invalidateQueries({ queryKey: ["despesas-all"] });
      toast.success("Despesa atualizada!");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message),
  });
};

export const useDeleteDespesa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      queryClient.invalidateQueries({ queryKey: ["despesas-all"] });
      toast.success("Despesa excluída!");
    },
    onError: (err: Error) => toast.error("Erro ao excluir: " + err.message),
  });
};
