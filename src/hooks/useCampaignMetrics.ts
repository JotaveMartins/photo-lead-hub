import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaDailyAdRow {
  id: string;
  date: string;
  ad_account_id: string;
  campaign_id: string | null;
  campaign_name: string;
  adset_id: string | null;
  adset_name: string;
  ad_id: string | null;
  ad_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  messaging_conversations_started: number;
  cost_per_messaging_conversation: number | null;
  campaign_objective: string | null;
  result_type: string | null;
  results: number;
  cost_per_result: number | null;
  client_id: string | null;
}

export function useCampaignMetrics(from: string, to: string, adAccountId?: string | null) {
  return useQuery({
    queryKey: ["meta_daily_ads", from, to, adAccountId || "all"],
    queryFn: async () => {
      const PAGE = 1000;
      const all: MetaDailyAdRow[] = [];
      let offset = 0;
      while (true) {
        let q = supabase
          .from("meta_daily_ads")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (adAccountId) {
          const bare = adAccountId.startsWith("act_") ? adAccountId.slice(4) : adAccountId;
          q = q.in("ad_account_id", [bare, `act_${bare}`]);
        }
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as MetaDailyAdRow[]));
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    },
  });
}