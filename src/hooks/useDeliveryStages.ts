import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import { sortStages, type DeliveryStage, type DeliveryStageColorKey } from "@/lib/deliveryStages";

export const useDeliveryStages = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["delivery-stages", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_stages")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return sortStages((data || []) as DeliveryStage[]);
    },
  });
};

const errMsg = (e: any) => e?.message || "tente novamente";

export const useCreateDeliveryStage = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ name, color_key }: { name: string; color_key: DeliveryStageColorKey }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      // Nova etapa entra imediatamente antes da etapa final (delivered).
      const { data: stages, error: readErr } = await supabase
        .from("delivery_stages")
        .select("id, position, stage_role")
        .eq("user_id", effectiveUserId)
        .order("position", { ascending: true });
      if (readErr) throw readErr;
      const delivered = (stages || []).find((s) => s.stage_role === "delivered");
      const insertPos = delivered ? delivered.position : (stages || []).length;
      // Abre espaço deslocando as etapas a partir da posição de inserção.
      for (const s of (stages || []).filter((s) => s.position >= insertPos)) {
        const { error } = await supabase
          .from("delivery_stages")
          .update({ position: s.position + 1 })
          .eq("id", s.id);
        if (error) throw error;
      }
      const { data, error } = await supabase
        .from("delivery_stages")
        .insert({ user_id: effectiveUserId, name: name.trim(), color_key, position: insertPos, stage_role: "open" })
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stages"] });
      toast.success("Etapa criada");
    },
    onError: (e: any) => toast.error("Erro ao criar etapa: " + errMsg(e)),
  });
};

export const useUpdateDeliveryStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color_key?: DeliveryStageColorKey }) => {
      if (updates.name !== undefined) updates.name = updates.name.trim();
      const { data, error } = await supabase
        .from("delivery_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stages"] });
    },
    onError: (e: any) => toast.error("Erro ao atualizar etapa: " + errMsg(e)),
  });
};

export const useDeleteDeliveryStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stages"] });
      toast.success("Etapa excluída");
    },
    onError: (e: any) => toast.error(errMsg(e)),
  });
};

/** Persiste a ordem das etapas (ids na ordem desejada). Delivered deve permanecer por último. */
export const useReorderDeliveryStages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("delivery_stages")
          .update({ position: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stages"] });
    },
    onError: (e: any) => toast.error("Erro ao reordenar etapas: " + errMsg(e)),
  });
};
