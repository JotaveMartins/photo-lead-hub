import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import Sidebar from "@/components/Sidebar";
import { TutorialModal, HelpButton } from "@/components/TutorialModal";
import { X } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading } = useAuth();
  const { isImpersonating, impersonatedUserName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveItem = () => {
    const path = location.pathname;
    if (path === "/" || path === "/leads") return "leads";
    if (path === "/tarefas") return "tarefas";
    if (path === "/relatorios") return "relatorios";
    if (path === "/servicos") return "servicos";
    if (path === "/pacotes") return "pacotes";
    if (path === "/agenda") return "agenda";
    if (path === "/financeiro/cobrancas") return "financeiro/cobrancas";
    if (path === "/financeiro/despesas") return "financeiro/despesas";
    if (path.startsWith("/financeiro")) return "financeiro/cobrancas";
    if (path === "/admin") return "admin";
    return "leads";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleItemClick = (item: string) => {
    const routes: Record<string, string> = {
      leads: "/leads",
      tarefas: "/tarefas",
      relatorios: "/relatorios",
      servicos: "/servicos",
      pacotes: "/pacotes",
      agenda: "/agenda",
      "financeiro/cobrancas": "/financeiro/cobrancas",
      "financeiro/despesas": "/financeiro/despesas",
      admin: "/admin",
    };
    navigate(routes[item] || "/leads");
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem={getActiveItem()} onItemClick={handleItemClick} />
      <main className="ml-64 p-6 lg:p-8">
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-glow pointer-events-none opacity-50" />
        {isImpersonating && (
          <div className="mb-4 -mt-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5">
            <span className="text-sm font-medium text-primary">
              Visualizando como <strong>{impersonatedUserName}</strong>
            </span>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        )}
        {children}
      </main>
      <TutorialModal />
      <HelpButton />
    </div>
  );
};

export default DashboardLayout;
