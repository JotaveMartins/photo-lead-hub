import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export type CobrancaStatus = "aguardando" | "paga" | "vencida";
export type CobrancaTipo = "unica" | "parcela" | "recorrente";
export type PaymentMethod = "pix" | "cartao" | "boleto" | "transferencia" | "dinheiro";

export interface Cobranca {
  id: string;
  user_id: string;
  lead_id: string | null;
  grupo_id: string | null;
  tipo: CobrancaTipo;
  descricao: string | null;
  valor: number;
  forma_pagamento: PaymentMethod;
  status: CobrancaStatus;
  vencimento: string;
  data_pagamento: string | null;
  parcela_numero: number | null;
  parcela_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface CobrancaInsert {
  user_id: string;
  lead_id?: string | null;
  cliente_id?: string | null;
  grupo_id?: string | null;
  tipo?: CobrancaTipo;
  descricao?: string | null;
  valor: number;
  forma_pagamento?: PaymentMethod;
  status?: CobrancaStatus;
  vencimento: string;
  data_pagamento?: string | null;
  parcela_numero?: number | null;
  parcela_total?: number | null;
}

export const useCobrancas = (month?: Date) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["cobrancas", effectiveUserId, month?.toISOString()],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from("cobrancas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("vencimento", { ascending: true });

      if (month) {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];
        query = query.gte("vencimento", startStr).lte("vencimento", endStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Cobranca[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useAllCobrancas = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["cobrancas-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as Cobranca[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateCobranca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CobrancaInsert) => {
      const payload: CobrancaInsert = {
        tipo: "unica",
        forma_pagamento: "pix",
        ...data,
        status: data.status ?? "aguardando",
      };

      const { data: result, error } = await supabase
        .from("cobrancas")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-all"] });
    },
  });
};

export const useCreateCobrancasBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CobrancaInsert[]) => {
      const payload = items.map((item) => ({
        tipo: "unica" as CobrancaTipo,
        forma_pagamento: "pix" as PaymentMethod,
        ...item,
        status: item.status ?? "aguardando",
      }));

      const { data, error } = await supabase
        .from("cobrancas")
        .insert(payload as any[])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-all"] });
      toast.success("Cobranças criadas com sucesso!");
    },
  });
};

export const useUpdateCobranca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CobrancaInsert>) => {
      const { data: result, error } = await supabase
        .from("cobrancas")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-all"] });
    },
  });
};

export const useDeleteCobranca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cobrancas")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-all"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-deleted"] });
      toast.success("Cobrança movida para a lixeira!");
    },
  });
};

export const useDeletedCobrancas = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["cobrancas-deleted", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (Cobranca & { deleted_at: string })[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useRestoreCobranca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cobrancas")
        .update({ deleted_at: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-all"] });
      queryClient.invalidateQueries({ queryKey: ["cobrancas-deleted"] });
      toast.success("Cobrança restaurada!");
    },
  });
};

export const usePermanentDeleteCobranca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cobrancas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas-deleted"] });
      toast.success("Cobrança excluída permanentemente!");
    },
  });
};
