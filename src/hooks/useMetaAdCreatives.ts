import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaAdCreative {
  ad_id: string;
  thumbnail_url: string | null;
  image_url: string | null;
  permalink_url: string | null;
  creative_type: string | null;
}

export function useMetaAdCreatives(adIds: string[]) {
  const ids = Array.from(new Set(adIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: ["meta_ad_creatives", ids],
    queryFn: async () => {
      if (ids.length === 0) return {} as Record<string, MetaAdCreative>;
      const map: Record<string, MetaAdCreative> = {};
      // chunk to keep .in() reasonable
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data, error } = await supabase
          .from("meta_ad_creatives")
          .select("ad_id,thumbnail_url,image_url,permalink_url,creative_type")
          .in("ad_id", chunk);
        if (error) throw error;
        for (const r of data || []) map[r.ad_id] = r as MetaAdCreative;
      }
      return map;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}