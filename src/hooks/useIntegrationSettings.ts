import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export interface IntegrationSettings {
  asaas_api_key: string | null;
}

export const useIntegrationSettings = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["integration-settings", effectiveUserId],
    queryFn: async (): Promise<IntegrationSettings> => {
      if (!effectiveUserId) return { asaas_api_key: null };
      const { data, error } = await supabase
        .from("profiles")
        .select("asaas_api_key")
        .eq("user_id", effectiveUserId)
        .single();
      if (error) throw error;
      return {
        asaas_api_key: (data as any)?.asaas_api_key ?? null,
      };
    },
    enabled: !!effectiveUserId,
  });
};

export const useSaveIntegrationSettings = () => {
  const qc = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (settings: Partial<IntegrationSettings>) => {
      if (!effectiveUserId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update(settings as any)
        .eq("user_id", effectiveUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Integrações salvas com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar integrações."),
  });
};

export const useAsaasCreateCharge = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (cobranca_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("asaas-create-charge", {
        body: { cobranca_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: boolean; asaas_id: string; invoice_url: string | null; pix_code: string | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobrancas"] });
      qc.invalidateQueries({ queryKey: ["cobrancas-all"] });
    },
  });
};
