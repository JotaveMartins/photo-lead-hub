import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Returns true only when the global AI toggle (ai_config.is_active) is ON.
 * Distinct from useAiActive, which also returns true when the trigger mode is enabled.
 */
export const useAiGlobalActive = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["ai_global_active", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_config")
        .select("is_active")
        .eq("user_id", userId!)
        .maybeSingle();
      return !!data?.is_active;
    },
  });
};