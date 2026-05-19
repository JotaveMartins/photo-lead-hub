import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export const useWhatsAppInstances = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["whatsapp_instances", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("user_id", effectiveUserId);

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
};
