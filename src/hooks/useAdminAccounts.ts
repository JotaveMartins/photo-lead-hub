import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Contas de administrador (dados fictícios/demo) que devem ser excluídas
 * do consolidado em Relatórios.
 */
export const useAdminAccounts = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const query = useQuery({
    queryKey: ["admin-accounts", user?.id],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw error;
      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (userIds.length === 0) return { userIds, adAccountIds: [] as string[] };

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, meta_ad_account_id")
        .in("user_id", userIds);

      const adAccountIds = (profs ?? [])
        .map((p) => (p as any).meta_ad_account_id as string | null)
        .filter(Boolean)
        .flatMap((acc: string) => {
          const bare = acc.startsWith("act_") ? acc.slice(4) : acc;
          return [bare, `act_${bare}`];
        });

      return { userIds, adAccountIds };
    },
    enabled: !!user && isAdmin,
  });

  return {
    adminUserIds: query.data?.userIds ?? [],
    adminAdAccountIds: query.data?.adAccountIds ?? [],
    isLoading: query.isLoading,
    isReady: !isAdmin || query.isSuccess,
  };
};
