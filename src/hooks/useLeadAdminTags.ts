import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export const TAG_COLORS = [
  { value: "red", label: "Vermelho", className: "bg-red-500" },
  { value: "orange", label: "Laranja", className: "bg-orange-500" },
  { value: "yellow", label: "Amarelo", className: "bg-yellow-400" },
  { value: "green", label: "Verde", className: "bg-emerald-500" },
  { value: "blue", label: "Azul", className: "bg-blue-500" },
  { value: "purple", label: "Roxo", className: "bg-purple-500" },
  { value: "pink", label: "Rosa", className: "bg-pink-500" },
] as const;

export const tagColorClass = (color?: string | null) =>
  TAG_COLORS.find((c) => c.value === color)?.className ?? "";

export const tagColorLabel = (color?: string | null) =>
  TAG_COLORS.find((c) => c.value === color)?.label ?? "";

/** Etiquetas de cor visíveis somente para o administrador que as criou. */
export const useLeadAdminTags = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: tags = {} } = useQuery({
    queryKey: ["lead-admin-tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_admin_tags")
        .select("lead_id, color")
        .eq("admin_id", user!.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((t: any) => {
        map[t.lead_id] = t.color;
      });
      return map;
    },
    enabled: !!user && isAdmin,
  });

  const setTag = useMutation({
    mutationFn: async ({ leadId, color }: { leadId: string; color: string | null }) => {
      if (!user) throw new Error("Sem sessão");
      if (!color) {
        const { error } = await supabase
          .from("lead_admin_tags")
          .delete()
          .eq("lead_id", leadId)
          .eq("admin_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("lead_admin_tags")
        .upsert({ lead_id: leadId, admin_id: user.id, color }, { onConflict: "lead_id,admin_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-admin-tags"] });
    },
  });

  return { isAdmin, tags: tags as Record<string, string>, setTag };
};
