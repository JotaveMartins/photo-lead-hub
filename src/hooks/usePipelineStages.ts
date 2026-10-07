import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import {
  sortPipelineStages,
  leadStage,
  wonStage,
  lostStage,
  proposalStage,
  openPipelineStages,
  firstStageAfterLead,
  stageById,
  type PipelineStage,
  type PipelineStageColorKey,
} from "@/lib/pipelineStages";

/** Hook operacional das etapas do Funil de Leads (fonte: pipeline_stages). */
export const usePipelineStages = () => {
  const effectiveUserId = useEffectiveUserId();

  const query = useQuery({
    queryKey: ["pipeline-stages", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return sortPipelineStages((data || []) as PipelineStage[]);
    },
  });

  const stages = query.data ?? [];

  return {
    ...query,
    stages,
    stageById: (id: string | null | undefined) => stageById(stages, id),
    leadStage: leadStage(stages),
    proposalStage: proposalStage(stages),
    wonStage: wonStage(stages),
    lostStage: lostStage(stages),
    openStages: openPipelineStages(stages),
    firstStageAfterLead: firstStageAfterLead(stages),
    /** Etapa legada "Follow-up" (ponte da sequência de follow-up pós-proposta). */
    followUpStage: stages.find((s) => s.legacy_status === "Follow-up"),
  };
};

const errMsg = (e: any) => e?.message || "tente novamente";

export const useCreatePipelineStage = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ name, color_key, role }: { name: string; color_key: PipelineStageColorKey; role: "open" | "proposal" }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.rpc("create_pipeline_stage", {
        _user_id: effectiveUserId,
        _name: name.trim(),
        _color_key: color_key,
        _role: role,
      });
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa criada");
    },
    onError: (e: any) => toast.error("Erro ao criar etapa: " + errMsg(e)),
  });
};

export const useUpdatePipelineStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color_key }: { id: string; name?: string; color_key?: PipelineStageColorKey }) => {
      const { data, error } = await supabase.rpc("update_pipeline_stage", {
        _id: id,
        _name: name !== undefined ? name.trim() : null,
        _color_key: color_key ?? null,
      });
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
    onError: (e: any) => toast.error("Erro ao atualizar etapa: " + errMsg(e)),
  });
};

export const useDeletePipelineStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_pipeline_stage", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa excluída");
    },
    onError: (e: any) => toast.error(errMsg(e)),
  });
};

/** Persiste a ordem das etapas (ids na ordem desejada) de forma transacional via RPC. */
export const useReorderPipelineStages = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { error } = await supabase.rpc("reorder_pipeline_stages", {
        _user_id: effectiveUserId,
        _ids: orderedIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
    onError: (e: any) => toast.error("Erro ao reordenar etapas: " + errMsg(e)),
  });
};
