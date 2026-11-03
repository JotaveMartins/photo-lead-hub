import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { ErrorState } from "@/components/ui/error-state";

const AccountAccessGate = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useUserRole();
  const access = useAccountAccess();
  if (isAdmin) return <>{children}</>;
  if (access.isLoading) return <p className="py-20 text-center text-muted-foreground">Verificando seu acesso...</p>;
  if (access.isError || !access.data) return <ErrorState title="Não foi possível verificar seu acesso" onRetry={() => access.refetch()} />;
  if (!access.data.allowed) return <Navigate to="/assinatura" replace />;
  return <>{children}</>;
};
export default AccountAccessGate;
