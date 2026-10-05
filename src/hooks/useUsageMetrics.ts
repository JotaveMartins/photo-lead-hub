import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccounts } from "@/hooks/useAdminAccounts";
import { scoreAccounts, monthStartISO, previousMonthDate, type UsageRow, type ScoredAccount } from "@/lib/usageScore";

const fetchMetrics = async (monthStart: string): Promise<UsageRow[]> => {
  const { data, error } = await supabase.rpc("admin_usage_metrics" as any, { month_start: monthStart } as any);
  if (error) throw error;
  return (data ?? []) as unknown as UsageRow[];
};

/**
 * Métricas de uso do CRM por conta, para o mês informado (primeiro dia do mês).
 * Sempre traz também o mês anterior para comparação.
 */
export const useUsageMetrics = (month: Date) => {
  const { isAdmin } = useUserRole();
  const { adminUserIds } = useAdminAccounts();

  const current = useQuery({
    queryKey: ["usage-metrics", monthStartISO(month)],
    queryFn: () => fetchMetrics(monthStartISO(month)),
    enabled: isAdmin,
  });

  const previous = useQuery({
    queryKey: ["usage-metrics", monthStartISO(previousMonthDate(month))],
    queryFn: () => fetchMetrics(monthStartISO(previousMonthDate(month))),
    enabled: isAdmin,
  });

  // Fora da medição: contas bloqueadas, só-CRM (plano básico) e conta tester da Meta
  const excluded = useQuery({
    queryKey: ["usage-excluded-accounts"],
    enabled: isAdmin,
    queryFn: async () => {
      const [profilesRes, testersRes] = await Promise.all([
        supabase.from("profiles").select("user_id").or("bloqueado.eq.true,plano_basico.eq.true"),
        supabase.from("user_roles").select("user_id").eq("role", "tester" as any),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (testersRes.error) throw testersRes.error;
      return [
        ...(profilesRes.data ?? []).map((p) => p.user_id),
        ...(testersRes.data ?? []).map((r) => r.user_id),
      ];
    },
  });

  const exclude = new Set([...adminUserIds, ...(excluded.data ?? [])]);
  const filter = (rows: UsageRow[] | undefined) => (rows ?? []).filter((r) => !exclude.has(r.user_id));

  const accounts: ScoredAccount[] = scoreAccounts(filter(current.data)).sort((a, b) => b.score - a.score);
  const previousAccounts: ScoredAccount[] = scoreAccounts(filter(previous.data));
  const previousByUser = new Map(previousAccounts.map((a) => [a.row.user_id, a]));

  return {
    accounts,
    previousByUser,
    isLoading: current.isLoading || previous.isLoading || excluded.isLoading,
    error: current.error || previous.error,
  };
};
