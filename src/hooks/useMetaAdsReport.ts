import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccountSegments } from "@/hooks/useAdminAccountSegments";

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
  const directory = useAdminAccountSegments();
  const customerIds = directory.customerIds;
  const adIds = directory.customerAdAccountIds;

  // Admin: "__all__" = consolidado (sem filtro); vazio = dados da própria conta
  const targetUserId = isAdmin
    ? clienteUserId === "__all__"
      ? null
      : clienteUserId || effectiveUserId
    : effectiveUserId;

  return useQuery({
    queryKey: ["meta_ads_report", from, to, isAdmin, targetUserId, customerIds, adIds],
    queryFn: async () => {
      if (!targetUserId && !customerIds.length) return [];
      // Resolve the ad account linked to the target profile so rows that are not
      // linked by client_id still show up for that client.
      let adAccountIds: string[] | null = null;
      if (targetUserId) {
        const { data: prof, error: profileError } = await supabase
          .from("profiles")
          .select("meta_ad_account_id")
          .eq("user_id", targetUserId)
          .maybeSingle();
        if (profileError) throw profileError;
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
        if (!targetUserId) {
          const matches = [`client_id.in.(${customerIds.join(",")})`];
          if (adIds.length) matches.push(`and(client_id.is.null,ad_account_id.in.(${adIds.join(",")}))`);
          q = q.or(matches.join(","));
        }
        const { data, error } = await q.order("id");
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as MetaAdsRow[]));
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      if (!targetUserId) {
        const customers = new Set(customerIds);
        const accounts = new Set(adIds);
        return all.filter(row => row.client_id ? customers.has(row.client_id) : accounts.has(row.ad_account_id));
      }
      return all;
    },
    enabled: !!user && (isAdmin || !!effectiveUserId) && (!!targetUserId || directory.isReady),
  });
}