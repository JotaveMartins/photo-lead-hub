import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";

export interface MetaAdsRow {
  date: string;
  ad_account_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  messaging_conversations_started: number;
  client_id: string | null;
}

export function useMetaAdsReport(from: string, to: string, clienteUserId?: string) {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();

  const targetUserId = isAdmin ? (clienteUserId || null) : effectiveUserId;

  return useQuery({
    queryKey: ["meta_ads_report", from, to, isAdmin, targetUserId],
    queryFn: async () => {
      const PAGE = 1000;
      const all: MetaAdsRow[] = [];
      let offset = 0;
      while (true) {
        let q = supabase
          .from("meta_daily_ads")
          .select("date,ad_account_id,campaign_name,spend,impressions,clicks,reach,messaging_conversations_started,client_id")
          .gte("date", from)
          .lte("date", to)
          .range(offset, offset + PAGE - 1);
        if (targetUserId) q = q.eq("client_id", targetUserId);
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as MetaAdsRow[]));
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    },
    enabled: !!user && (isAdmin || !!effectiveUserId),
  });
}