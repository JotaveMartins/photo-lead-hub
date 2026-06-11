import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Returns true when any AI mode is active (always-on or trigger-based).
 * Used to decide whether to show the "Triagem Feita" pipeline stage.
 */
export const useAiActive = () => {
  const userId = useEffectiveUserId();

  return useQuery({
    queryKey: ["ai_active", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_config")
        .select("is_active, ai_trigger_enabled")
        .eq("user_id", userId!)
        .maybeSingle();
      return !!(data?.is_active || (data as any)?.ai_trigger_enabled);
    },
  });
};