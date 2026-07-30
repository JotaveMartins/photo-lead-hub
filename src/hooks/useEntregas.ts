import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type EntregaEtapa = Database["public"]["Enums"]["entrega_etapa"];
export type Entrega = Database["public"]["Tables"]["entregas"]["Row"] & {
  clientes?: { nome: string; whatsapp: string | null } | null;
  services?: { nome: string } | null;
};

export const ENTREGA_ETAPAS: { etapa: EntregaEtapa; label: string; color: string }[] = [
  { etapa: "Ensaio Agendado", label: "Ensaio Agendado", color: "bg-[hsl(var(--delivery-1))]" },
  { etapa: "Ensaio Realizado", label: "Ensaio Realizado", color: "bg-[hsl(var(--delivery-2))]" },
  { etapa: "Prévia enviada", label: "Prévia enviada", color: "bg-[hsl(var(--delivery-3))]" },
  { etapa: "Em edição", label: "Em edição", color: "bg-[hsl(var(--delivery-4))]" },
  { etapa: "Entregue", label: "Entregue", color: "bg-[hsl(var(--delivery-5))]" },
];

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
      toast.success("Entrega removida");
    },
    onError: (e: any) => toast.error("Erro ao remover entrega: " + (e?.message || "tente novamente")),
  });
};