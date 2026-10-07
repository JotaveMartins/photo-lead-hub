import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccounts } from "@/hooks/useAdminAccounts";
import type { Tables } from "@/integrations/supabase/types";

export type ReportLead = Tables<"leads">;
export type ReportTask = Tables<"lead_tasks">;
export type ReportProfile = Pick<
  Tables<"profiles">,
  "user_id" | "nome" | "email" | "created_at" | "meta_ad_account_id"
>;
export type ReportStage = Pick<
  Tables<"pipeline_stages">,
  "id" | "user_id" | "name" | "color_key" | "position" | "stage_role" | "legacy_status"
>;
export type ReportStageHistory = Pick<
  Tables<"lead_stage_history">,
  "lead_id" | "to_stage_id" | "to_stage_role" | "entered_at"
>;

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
  const { adminUserIds, isReady: adminAccountsReady } = useAdminAccounts();

  const isConsolidated = isAdmin && params.clienteUserId === ALL_CLIENTS;

  const leadsQuery = useQuery({
    queryKey: ["report-leads", effectiveUserId, isAdmin, params.clienteUserId, adminUserIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase.from("leads").select("*");

      // Admin: "__all__" = consolidado (exclui contas de administrador — dados fictícios)
      if (isConsolidated) {
        if (adminUserIds.length > 0) {
          query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
        }
      } else if (isAdmin && params.clienteUserId) {
        query = query.eq("user_id", params.clienteUserId);
      } else {
        // Otherwise use effective user id (handles impersonation)
        query = query.eq("user_id", effectiveUserId!);
      }

        return query;
      };
      return fetchAll<ReportLead>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || adminAccountsReady),
  });

  const tasksQuery = useQuery({
    queryKey: ["report-tasks", effectiveUserId, isAdmin, params.clienteUserId, adminUserIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase.from("lead_tasks").select("*");

      if (isConsolidated) {
        if (adminUserIds.length > 0) {
          query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
        }
      } else if (isAdmin && params.clienteUserId) {
        query = query.eq("user_id", params.clienteUserId);
      } else {
        query = query.eq("user_id", effectiveUserId!);
      }

        return query;
      };
      return fetchAll<ReportTask>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || adminAccountsReady),
  });


  // Sprint 02: etapas do funil e histórico de movimentações (fonte semântica dos relatórios)
  const stagesQuery = useQuery({
    queryKey: ["report-pipeline-stages", effectiveUserId, isAdmin, params.clienteUserId],
    queryFn: async () => {
      const build = () => {
        let query = supabase
          .from("pipeline_stages")
          .select("id, user_id, name, color_key, position, stage_role, legacy_status");
        if (isConsolidated) {
          // consolidado: precisa das etapas de todas as contas para classificar cada lead
        } else if (isAdmin && params.clienteUserId) {
          query = query.eq("user_id", params.clienteUserId);
        } else {
          query = query.eq("user_id", effectiveUserId!);
        }
        return query;
      };
      return fetchAll<ReportStage>(build);
    },
    enabled: !!effectiveUserId,
  });

  const historyQuery = useQuery({
    queryKey: ["report-lead-stage-history", effectiveUserId, isAdmin, params.clienteUserId, adminUserIds],
    queryFn: async () => {
      const build = () => {
        let query = supabase
          .from("lead_stage_history")
          .select("lead_id, to_stage_id, to_stage_role, entered_at");
        if (isConsolidated) {
          if (adminUserIds.length > 0) {
            query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
          }
        } else if (isAdmin && params.clienteUserId) {
          query = query.eq("user_id", params.clienteUserId);
        } else {
          query = query.eq("user_id", effectiveUserId!);
        }
        return query;
      };
      return fetchAll<ReportStageHistory>(build);
    },
    enabled: !!effectiveUserId && (!isConsolidated || adminAccountsReady),
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
    profiles: profilesQuery.data ?? [],
    stages: stagesQuery.data ?? [],
    stageHistory: historyQuery.data ?? [],
    isLoading:
      leadsQuery.isLoading ||
      tasksQuery.isLoading ||
      stagesQuery.isLoading ||
      historyQuery.isLoading,
    isAdmin,
  };
};
