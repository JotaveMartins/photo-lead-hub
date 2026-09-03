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

interface UseReportDataParams {
  clienteUserId?: string;
}

export const ALL_CLIENTS = "__all__";

export const useReportData = (params: UseReportDataParams = {}) => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();
  const { adminUserIds, isReady: adminAccountsReady } = useAdminAccounts();

  const isConsolidated = isAdmin && params.clienteUserId === ALL_CLIENTS;

  const leadsQuery = useQuery({
    queryKey: ["report-leads", effectiveUserId, isAdmin, params.clienteUserId, adminUserIds],
    queryFn: async () => {
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

      const { data, error } = await query;
      if (error) throw error;
      return data as ReportLead[];
    },
    enabled: !!effectiveUserId && (!isConsolidated || adminAccountsReady),
  });

  const tasksQuery = useQuery({
    queryKey: ["report-tasks", effectiveUserId, isAdmin, params.clienteUserId, adminUserIds],
    queryFn: async () => {
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

      const { data, error } = await query;
      if (error) throw error;
      return data as ReportTask[];
    },
    enabled: !!effectiveUserId && (!isConsolidated || adminAccountsReady),
  });


  const profilesQuery = useQuery({
    queryKey: ["report-profiles", user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, email")
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
    isLoading: leadsQuery.isLoading || tasksQuery.isLoading,
    isAdmin,
  };
};
