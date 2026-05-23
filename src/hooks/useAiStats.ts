import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export interface AiStats {
  total: number;
  pending_ai: number;
  open: number;
  closed: number;
  today: number;
}

export const useAiStats = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["ai_stats", effectiveUserId],
    queryFn: async (): Promise<AiStats> => {
      if (!effectiveUserId) return { total: 0, pending_ai: 0, open: 0, closed: 0, today: 0 };
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [{ data: all }, { data: todayData }] = await Promise.all([
        supabase
          .from("inbox_conversations")
          .select("status")
          .eq("user_id", effectiveUserId),
        supabase
          .from("inbox_conversations")
          .select("id")
          .eq("user_id", effectiveUserId)
          .gte("created_at", todayStart.toISOString()),
      ]);

      const rows = all || [];
      return {
        total: rows.length,
        pending_ai: rows.filter((r) => r.status === "pending_ai").length,
        open: rows.filter((r) => r.status === "open").length,
        closed: rows.filter((r) => r.status === "closed").length,
        today: (todayData || []).length,
      };
    },
    enabled: !!effectiveUserId,
  });
};
