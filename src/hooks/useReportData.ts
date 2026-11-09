import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccountSegments } from "@/hooks/useAdminAccountSegments";
import type { Tables } from "@/integrations/supabase/types";
import type { PipelineStageRow, StageHistoryEventRow } from "@/lib/leadPipelineReporting";

export type ReportLead = Tables<"leads">;
export type ReportTask = Tables<"lead_tasks">;
export type ReportProfile = Pick<
  Tables<"profiles">,
  "user_id" | "nome" | "email" | "created_at" | "meta_ad_account_id"
>;
export type ReportStage = PipelineStageRow;
export type ReportStageHistory = StageHistoryEventRow;

interface UseReportDataParams {
  clienteUserId?: string;
}

export const ALL_CLIENTS = "__all__";

// Busca todas as linhas em páginas (o servidor devolve no máximo 1000 por vez)
const fetchAll = async <T,>(build: () => any): Promise<T[]> => {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().order("id").range(from, from + size - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < size) break;
  }
  return out;
};

export const useReportData = (params: UseReportDataParams = {}) => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();
  const directory = useAdminAccountSegments();
  const customerIds = directory.customerIds;

  const isConsolidated = isAdmin && params.clienteUserId === ALL_CLIENTS;

  const leadsQuery = useQuery({
    queryKey: ["report-leads", effectiveUserId, isAdmin, params.clienteUserId, customerIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase.from("leads").select("*");

      // Consolidated reports use only the explicit active customer population.
      if (isConsolidated) {
        query = query.in("user_id", customerIds);
      } else if (isAdmin && params.clienteUserId) {
        query = query.eq("user_id", params.clienteUserId);
      } else {
        // Otherwise use effective user id (handles impersonation)
        query = query.eq("user_id", effectiveUserId!);
      }

        return query;
      };
      if (isConsolidated && !customerIds.length) return [];
      return fetchAll<ReportLead>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || directory.isReady),
  });

  const tasksQuery = useQuery({
    queryKey: ["report-tasks", effectiveUserId, isAdmin, params.clienteUserId, customerIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase.from("lead_tasks").select("*");

      if (isConsolidated) {
        query = query.in("user_id", customerIds);
      } else if (isAdmin && params.clienteUserId) {
        query = query.eq("user_id", params.clienteUserId);
      } else {
        query = query.eq("user_id", effectiveUserId!);
      }

        return query;
      };
      if (isConsolidated && !customerIds.length) return [];
      return fetchAll<ReportTask>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || directory.isReady),
  });


  // Sprint 02: etapas do funil e histórico de movimentações (fonte semântica dos relatórios)
  const stagesQuery = useQuery({
    queryKey: ["report-pipeline-stages", effectiveUserId, isAdmin, params.clienteUserId, customerIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase
          .from("pipeline_stages")
          .select("id, user_id, name, color_key, position, stage_role, legacy_status");
        if (isConsolidated) {
          query = query.in("user_id", customerIds);
        } else if (isAdmin && params.clienteUserId) {
          query = query.eq("user_id", params.clienteUserId);
        } else {
          query = query.eq("user_id", effectiveUserId!);
        }
        return query;
      };
      if (isConsolidated && !customerIds.length) return [];
      return fetchAll<ReportStage>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || directory.isReady),
  });

  const historyQuery = useQuery({
    queryKey: ["report-lead-stage-history", effectiveUserId, isAdmin, params.clienteUserId, customerIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase
          .from("lead_stage_history")
          .select("lead_id, to_stage_id, to_stage_role, entered_at");
        if (isConsolidated) {
          query = query.in("user_id", customerIds);
        } else if (isAdmin && params.clienteUserId) {
          query = query.eq("user_id", params.clienteUserId);
        } else {
          query = query.eq("user_id", effectiveUserId!);
        }
        return query;
      };
      if (isConsolidated && !customerIds.length) return [];
      return fetchAll<ReportStageHistory>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || directory.isReady),
  });

  const profilesQuery = useQuery({
    queryKey: ["report-profiles", user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, email, created_at, meta_ad_account_id")
        .order("nome");
      if (error) throw error;
      return data as ReportProfile[];
    },
    enabled: !!user && isAdmin,
  });

  return {
    leads: leadsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    profiles: directory.isReady ? (profilesQuery.data ?? []).filter(profile => customerIds.includes(profile.user_id)) : [],
    stages: stagesQuery.data ?? [],
    stageHistory: historyQuery.data ?? [],
    isLoading:
      leadsQuery.isLoading ||
      tasksQuery.isLoading ||
      stagesQuery.isLoading ||
      historyQuery.isLoading || (isAdmin && directory.isLoading),
    error: leadsQuery.error || tasksQuery.error || stagesQuery.error || historyQuery.error || profilesQuery.error || (isAdmin ? directory.error : null),
    refetch: () => Promise.all([...(isAdmin ? [directory.refetch(), profilesQuery.refetch()] : []), leadsQuery.refetch(), tasksQuery.refetch(), stagesQuery.refetch(), historyQuery.refetch()]),
    populationKey: isConsolidated ? customerIds.join(",") : params.clienteUserId || effectiveUserId || "",
    isAdmin,
  };
};
