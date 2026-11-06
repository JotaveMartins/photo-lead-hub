import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { adminClientReturnPath } from "@/lib/adminClientLink";

/** Same admin impersonation flow as AdminPage, with an explicit deep link. */
const AdminClientEntryPage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserRole();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isLoading || !isAdmin) return;
    let cancelled = false;
    setError(null);
    if (adminClientReturnPath(`/admin/clientes/${userId}`) === "/") {
      setError("Link de cliente inválido.");
      return;
    }
    void (async () => {
      const { data, error: queryError } = await supabase.from("profiles")
        .select("user_id, nome").eq("user_id", userId!).maybeSingle();
      if (cancelled) return;
      if (queryError || !data) {
        setError("Cliente não encontrado ou acesso indisponível.");
        return;
      }
      startImpersonation(data.user_id, data.nome || "Cliente");
      navigate("/leads", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, userId, isAdmin, isLoading, startImpersonation, navigate]);

  if (!isLoading && user && !isAdmin) return <p role="alert">Acesso restrito aos administradores do CRM.</p>;
  return <p role={error ? "alert" : "status"} className="p-6">{error || "Abrindo a área do cliente..."}</p>;
};
export default AdminClientEntryPage;
