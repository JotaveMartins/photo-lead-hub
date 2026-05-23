import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Contrato = Database["public"]["Tables"]["contratos"]["Row"];
type ContratoInsert = Database["public"]["Tables"]["contratos"]["Insert"];
type ContratoUpdate = Database["public"]["Tables"]["contratos"]["Update"];

export type ContratoStatus = "aguardando_contrato" | "contrato_enviado" | "contrato_assinado";

export { type Contrato };

export const useContratos = (status?: ContratoStatus) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["contratos", effectiveUserId, status],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from("contratos")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateContrato = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (contrato: Omit<ContratoInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contratos")
        .insert({ ...contrato, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: () => {
      toast.error("Erro ao criar contrato.");
    },
  });
};

export const useUpdateContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ContratoUpdate) => {
      const { data, error } = await supabase
        .from("contratos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar contrato.");
    },
  });
};

export const useDeleteContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato removido.");
    },
  });
};

export const useUploadContratoFile = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ contratoId, file }: { contratoId: string; file: File }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const ext = file.name.split(".").pop();
      const path = `${effectiveUserId}/${contratoId}/contrato.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("contratos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contratos")
        .getPublicUrl(path);

      const { data, error: updateError } = await supabase
        .from("contratos")
        .update({
          arquivo_contrato_url: urlData.publicUrl,
          status: "contrato_enviado",
        })
        .eq("id", contratoId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato anexado! Card movido para Contrato Enviado.");
    },
    onError: () => {
      toast.error("Erro ao anexar contrato.");
    },
  });
};
