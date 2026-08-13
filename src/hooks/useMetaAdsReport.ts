import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";

export interface MetaAdsRow {
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
  clicks: number;
  reach: number;
  messaging_conversations_started: number;
  client_id: string | null;
}

export function useMetaAdsReport(from: string, to: string, clienteUserId?: string) {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();

  // Admin: "__all__" = consolidado (sem filtro); vazio = dados da própria conta
  const targetUserId = isAdmin
    ? clienteUserId === "__all__"
      ? null
      : clienteUserId || effectiveUserId
    : effectiveUserId;

  return useQuery({
    queryKey: ["meta_ads_report", from, to, isAdmin, targetUserId],
    queryFn: async () => {
      // Resolve the ad account linked to the target profile so rows that are not
      // linked by client_id still show up for that client.
      let adAccountIds: string[] | null = null;
      if (targetUserId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("meta_ad_account_id")
          .eq("user_id", targetUserId)
          .maybeSingle();
        const acc = prof?.meta_ad_account_id;
        if (acc) {
          const bare = acc.startsWith("act_") ? acc.slice(4) : acc;
          adAccountIds = [bare, `act_${bare}`];
        }
      }

      const PAGE = 1000;
      const all: MetaAdsRow[] = [];
      let offset = 0;
      while (true) {
        let q = supabase
          .from("meta_daily_ads")
          .select("date,ad_account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,messaging_conversations_started,client_id")
          .gte("date", from)
          .lte("date", to)
          .range(offset, offset + PAGE - 1);
        if (targetUserId) {
          if (adAccountIds) {
            q = q.or(
              `client_id.eq.${targetUserId},ad_account_id.in.(${adAccountIds.join(",")})`,
            );
          } else {
            q = q.eq("client_id", targetUserId);
          }
        }
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