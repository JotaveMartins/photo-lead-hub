import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";
import type { Tables } from "@/integrations/supabase/types";

export type ReportLead = Tables<"leads">;
export type ReportTask = Tables<"lead_tasks">;
export type ReportProfile = Pick<Tables<"profiles">, "user_id" | "nome" | "email">;

interface UseReportDataParams {
  clienteUserId?: string;
}

export const ALL_CLIENTS = "__all__";

export const useReportData = (params: UseReportDataParams = {}) => {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();

  const leadsQuery = useQuery({
    queryKey: ["report-leads", effectiveUserId, isAdmin, params.clienteUserId],
    queryFn: async () => {
      let query = supabase.from("leads").select("*");

      // Admin: "__all__" = consolidated (no user filter); specific id = that client
      if (isAdmin && params.clienteUserId === ALL_CLIENTS) {
        // no filter
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
    enabled: !!effectiveUserId,
  });

  const tasksQuery = useQuery({
    queryKey: ["report-tasks", effectiveUserId, isAdmin, params.clienteUserId],
    queryFn: async () => {
      let query = supabase.from("lead_tasks").select("*");

      if (isAdmin && params.clienteUserId === ALL_CLIENTS) {
        // no filter
      } else if (isAdmin && params.clienteUserId) {
        query = query.eq("user_id", params.clienteUserId);
      } else {
        query = query.eq("user_id", effectiveUserId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReportTask[];
    },
    enabled: !!effectiveUserId,
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
