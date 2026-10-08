import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  startImpersonation: (userId: string, userName: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedUserId: null,
  impersonatedUserName: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
  isImpersonating: false,
});

export const useImpersonation = () => useContext(ImpersonationContext);

// sessionStorage: sobrevive a F5/refresh na mesma aba, mas é limpo ao fechar
// a aba — impersonação é uma ação temporária de admin, não deve virar sessão.
const STORAGE_KEY = "crm_impersonation";

const readStored = (): { userId: string; userName: string } | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string" && typeof parsed.userName === "string") {
      return parsed;
    }
  } catch {
    /* storage indisponível ou conteúdo inválido */
  }
  return null;
};

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(
    () => readStored()?.userId ?? null
  );
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(
    () => readStored()?.userName ?? null
  );

  // Segurança: se o admin sair da conta, a impersonação não pode sobrar para
  // a próxima sessão aberta na mesma aba.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setImpersonatedUserId(null);
        setImpersonatedUserName(null);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const startImpersonation = (userId: string, userName: string) => {
    setImpersonatedUserId(userId);
    setImpersonatedUserName(userName);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, userName }));
  };

  const stopImpersonation = () => {
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ImpersonationContext.Provider value={{
      impersonatedUserId,
      impersonatedUserName,
      startImpersonation,
      stopImpersonation,
      isImpersonating: !!impersonatedUserId,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};
