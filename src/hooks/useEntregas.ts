import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

/** @deprecated Legado. A fonte oficial da etapa é stage_id -> delivery_stages (useDeliveryStages). */
export type EntregaEtapa = Database["public"]["Enums"]["entrega_etapa"];
export type Entrega = Database["public"]["Tables"]["entregas"]["Row"] & {
  clientes?: { nome: string; whatsapp: string | null } | null;
  services?: { nome: string } | null;
};

export const useEntrega = (id?: string | null) =>
  useQuery({
    queryKey: ["entrega", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select(SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Entrega | null;
    },
  });

const SELECT = "*, clientes(nome, whatsapp), services(nome)";

export const useEntregas = (clienteId?: string) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["entregas", effectiveUserId, clienteId ?? "all"],
    queryFn: async () => {
      if (!effectiveUserId) return [] as Entrega[];
      let q = supabase
        .from("entregas")
        .select(SELECT)
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (clienteId) q = q.eq("cliente_id", clienteId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Entrega[];
    },
    enabled: !!effectiveUserId,
  });
};

type EntregaInput = Partial<Database["public"]["Tables"]["entregas"]["Insert"]>;

export const useCreateEntrega = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (input: EntregaInput) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("entregas")
        .insert({
          ...input,
          titulo: input.titulo?.trim() || "Entrega",
          user_id: effectiveUserId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entregas"] });
      queryClient.invalidateQueries({ queryKey: ["entrega"] });
    },
    onError: (e: any) => toast.error("Erro ao criar entrega: " + (e?.message || "tente novamente")),
  });
};

export const useUpdateEntrega = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EntregaInput & { id: string }) => {
      const { data, error } = await supabase
        .from("entregas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entregas"] });
      queryClient.invalidateQueries({ queryKey: ["entrega"] });
    },
    onError: (e: any) => toast.error("Erro ao atualizar entrega: " + (e?.message || "tente novamente")),
  });
};

export const useDeleteEntrega = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entregas")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entregas"] });
      queryClient.invalidateQueries({ queryKey: ["entrega"] });
      toast.success("Entrega arquivada");
    },
    onError: (e: any) => toast.error("Erro ao arquivar entrega: " + (e?.message || "tente novamente")),
  });
};
/** Entregas arquivadas (lixeira). */
export const useDeletedEntregas = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["entregas", "deleted", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select(SELECT)
        .eq("user_id", effectiveUserId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Entrega[];
    },
  });
};

export const useRestoreEntrega = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entregas").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entregas"] });
      toast.success("Entrega restaurada");
    },
    onError: (e: any) => toast.error("Erro ao restaurar entrega: " + (e?.message || "tente novamente")),
  });
};
// Exclusão permanente de Entrega NÃO é oferecida: galleries.entrega_id tem ON DELETE CASCADE
// e apagaria a galeria/fotos. Apenas arquivar/restaurar (Sprint 02).
