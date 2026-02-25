import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const useEffectiveUserId = () => {
  const { user } = useAuth();
  const { impersonatedUserId } = useImpersonation();
  return impersonatedUserId || user?.id || null;
};
