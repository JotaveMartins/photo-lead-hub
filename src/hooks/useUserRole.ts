import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: isTester, isLoading: isTesterLoading } = useQuery({
    queryKey: ["user-role-tester", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "tester" as any,
      });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: hasEstudio, isLoading: isEstudioLoading } = useQuery({
    queryKey: ["user-role-estudio", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "estudio" as any,
      });
      return !!data;
    },
    enabled: !!user,
  });

  return {
    isAdmin: !!isAdmin,
    isTester: !!isTester && !isAdmin,
    hasEstudio: !!isAdmin || !!isTester || !!hasEstudio,
    isLoading: isLoading || isTesterLoading || isEstudioLoading,
  };
};
