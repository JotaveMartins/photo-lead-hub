import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Whether the logged-in account (never the impersonated one) is blocked.
 * Blocked accounts keep their data but cannot access the CRM.
 */
export const useAccountBlocked = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["account-blocked", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("bloqueado")
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!(data as any)?.bloqueado;
    },
  });

  return { isBlocked: !!data, isLoading: !!user && isLoading };
};
