import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccountAccess } from "@/hooks/useAccountAccess";
import { customerAdAccountIds, describeAccount, isActiveCustomer, type AccountDescriptor } from "@/lib/accountSegments";

const readPages = async <T,>(build: () => any): Promise<T[]> => {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await build().order("user_id").range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
};

/** One shared, current directory for management, consolidated reports and usage. */
export const useAdminAccountSegments = () => {
  const { isAdmin } = useUserRole();
  const access = useAdminAccountAccess(isAdmin);
  const flags = useQuery({
    queryKey: ["admin-account-segments"], enabled: isAdmin, refetchInterval: 30_000,
    queryFn: async () => {
      const [profiles, testers] = await Promise.all([
        readPages<{ user_id: string; bloqueado: boolean | null; plano_basico: boolean | null; meta_ad_account_id: string | null }>(() => supabase.from("profiles").select("user_id, bloqueado, plano_basico, meta_ad_account_id")),
        readPages<{ user_id: string }>(() => supabase.from("user_roles").select("user_id").eq("role", "tester" as any)),
      ]);
      return { profiles, testerIds: new Set(testers.map(row => row.user_id)) };
    },
  });
  const isReady = isAdmin && access.isSuccess && flags.isSuccess;
  const byUser = new Map<string, AccountDescriptor>();
  if (isReady) {
    const profiles = new Map(flags.data.profiles.map(row => [row.user_id, row]));
    for (const row of access.data) {
      const profile = profiles.get(row.access.user_id);
      if (!profile) continue;
      byUser.set(row.access.user_id, describeAccount({ userId: row.access.user_id, access: row.access,
        blocked: profile.bloqueado, basic: profile.plano_basico, tester: flags.data.testerIds.has(row.access.user_id), createdAt: row.created_at, adAccountId: profile.meta_ad_account_id }));
    }
  }
  return { byUser, isReady, isLoading: isAdmin && (access.isLoading || flags.isLoading), error: access.error || flags.error,
    customerAdAccountIds: customerAdAccountIds(byUser.values()),
    customerIds: [...byUser.values()].filter(isActiveCustomer).map(row => row.userId).sort(),
    refetch: () => isAdmin ? Promise.all([access.refetch(), flags.refetch()]) : Promise.resolve([]),
  };
};
