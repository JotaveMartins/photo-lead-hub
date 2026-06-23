import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Returns true when the effective user's profile is marked as "Plano Básico".
 * Basic-plan accounts hide the AI menu and the Meta Ads section in reports.
 */
export const usePlanoBasico = () => {
  const userId = useEffectiveUserId();

  const { data } = useQuery({
    queryKey: ["plano_basico", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plano_basico")
        .eq("user_id", userId!)
        .maybeSingle();
      return !!(data as any)?.plano_basico;
    },
  });

  return !!data;
};