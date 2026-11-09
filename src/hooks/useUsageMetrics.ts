import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccountSegments } from "@/hooks/useAdminAccountSegments";
import { existedInUsageMonth, inUsagePopulation, type UsagePopulation } from "@/lib/accountSegments";
import { scoreAccounts, monthStartISO, previousMonthDate, type UsageRow, type ScoredAccount } from "@/lib/usageScore";

const fetchMetrics = async (monthStart: string): Promise<UsageRow[]> => {
  const rows: UsageRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.rpc("admin_usage_metrics" as any, { month_start: monthStart } as any)
      .order("user_id").range(offset, offset + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as UsageRow[]));
    if (!data || data.length < 1000) return rows;
  }
};

/**
 * Métricas de uso do CRM por conta, para o mês informado (primeiro dia do mês).
 * Sempre traz também o mês anterior para comparação.
 */
export const useUsageMetrics = (month: Date, population: UsagePopulation = "customers") => {
  const { isAdmin } = useUserRole();
  const directory = useAdminAccountSegments();

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

  const filter = (rows: UsageRow[] | undefined, selectedMonth: Date) => directory.isReady ? (rows ?? []).filter(row => {
    const account = directory.byUser.get(row.user_id);
    return !!account && inUsagePopulation(account, population) && existedInUsageMonth(account, selectedMonth);
  }) : [];
  // Normalize each population independently; trials cannot change customer scores.
  const accounts: ScoredAccount[] = scoreAccounts(filter(current.data, month)).sort((a, b) => b.score - a.score);
  const previousAccounts: ScoredAccount[] = scoreAccounts(filter(previous.data, previousMonthDate(month)));
  const previousByUser = new Map(previousAccounts.map((a) => [a.row.user_id, a]));

  return {
    accounts,
    accountDetails: directory.byUser,
    previousByUser,
    isLoading: current.isLoading || previous.isLoading || directory.isLoading,
    error: current.error || previous.error || directory.error,
    refetch: () => isAdmin ? Promise.all([current.refetch(), previous.refetch(), directory.refetch()]) : Promise.resolve([]),
  };
};
