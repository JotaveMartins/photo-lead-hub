import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { accountAccessSchema } from "@/lib/accountAccess";

export const useAccountAccess = (targetUserId?: string | null) => {
  const { user } = useAuth();
  const userId = targetUserId ?? user?.id;
  return useQuery({
    queryKey: ["crm-account-access", user?.id, userId],
    enabled: !!user && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_crm_account_access", { p_user_id: userId! });
      if (error) throw error;
      return accountAccessSchema.parse(data);
    },
    staleTime: 0, refetchInterval: 30_000, retry: 1,
  });
};

const adminAccessRowSchema = z.object({ nome: z.string().nullable(), email: z.string().nullable(), created_at: z.string(), access: accountAccessSchema });
export const useAdminAccountAccess = (enabled = true) => useQuery({
  enabled,
  queryKey: ["admin-crm-access"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_list_crm_access");
    if (error) throw error;
    return z.array(adminAccessRowSchema).parse(data);
  },
  refetchInterval: 30_000,
});

export const useManageAccountAccess = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; action: "extend_trial" | "grant_semestral" | "grant_anual"; days?: number; note: string }) => {
      const { data, error } = await supabase.rpc("admin_manage_crm_access", {
        p_user_id: input.userId, p_action: input.action, p_days: input.days, p_note: input.note,
      });
      if (error) throw error;
      return accountAccessSchema.parse(data);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-crm-access"] });
      client.invalidateQueries({ queryKey: ["crm-account-access"] });
      client.invalidateQueries({ queryKey: ["admin-account-segments"] });
      client.invalidateQueries({ queryKey: ["report-profiles"] });
    },
  });
};
