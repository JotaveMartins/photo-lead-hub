import { ReactNode, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import Sidebar from "@/components/Sidebar";
import { TutorialModal, HelpButton } from "@/components/TutorialModal";
import VersionAnnouncementModal from "@/components/VersionAnnouncementModal";
import { X, Menu } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  agendaTutorial,
  servicosTutorial,
  pacotesTutorial,
  cobrancasTutorial,
  despesasTutorial,
  clienteDetailTutorial,
} from "@/data/pageTutorials";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isImpersonating, impersonatedUserName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getActiveItem = () => {
    const path = location.pathname;
    if (path === "/" || path === "/leads") return "leads";
    if (path === "/tarefas") return "tarefas";
    if (path === "/relatorios") return "relatorios";
    if (path === "/servicos") return "servicos";
    if (path === "/pacotes") return "pacotes";
    if (path === "/agenda") return "agenda";
    if (path === "/clientes" || path.startsWith("/clientes/")) return "clientes";
    if (path === "/equipe") return "equipe";
    if (path === "/anuncios") return "anuncios";
    if (path === "/contratos") return "contratos";
    if (path === "/financeiro/cobrancas") return "financeiro/cobrancas";
    if (path === "/financeiro/despesas") return "financeiro/despesas";
    if (path === "/financeiro") return "financeiro";
    if (path === "/admin") return "admin";
    if (path === "/ia") return "ia";
    if (path === "/whatsapp") return "whatsapp";
    if (path === "/inbox") return "inbox";
    if (path === "/integracoes") return "integracoes";
    return "leads";
  };

  // Determine page-specific tutorial based on current route
  const { pageTutorial, pageKey } = useMemo(() => {
    const path = location.pathname;
    if (path === "/agenda") return { pageTutorial: agendaTutorial, pageKey: "agenda" };
    if (path === "/servicos") return { pageTutorial: servicosTutorial, pageKey: "servicos" };
    if (path === "/pacotes") return { pageTutorial: pacotesTutorial, pageKey: "pacotes" };
    if (path === "/financeiro/cobrancas") return { pageTutorial: cobrancasTutorial, pageKey: "cobrancas" };
    if (path === "/financeiro/despesas") return { pageTutorial: despesasTutorial, pageKey: "despesas" };
    if (path.startsWith("/clientes/") && path !== "/clientes") return { pageTutorial: clienteDetailTutorial, pageKey: "cliente-detail" };
    return { pageTutorial: undefined, pageKey: undefined };
  }, [location.pathname]);

  const handleItemClick = (item: string) => {
    const routes: Record<string, string> = {
      leads: "/leads",
      tarefas: "/tarefas",
      relatorios: "/relatorios",
      servicos: "/servicos",
      pacotes: "/pacotes",
      agenda: "/agenda",
      clientes: "/clientes",
      equipe: "/equipe",
      anuncios: "/anuncios",
      contratos: "/contratos",
      financeiro: "/financeiro",
      "financeiro/cobrancas": "/financeiro/cobrancas",
      "financeiro/despesas": "/financeiro/despesas",
      admin: "/admin",
      ia: "/ia",
      whatsapp: "/whatsapp",
      inbox: "/inbox",
      integracoes: "/integracoes",
    };
    navigate(routes[item] || "/leads");
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeItem={getActiveItem()}
        onItemClick={handleItemClick}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-muted text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
          <span className="font-display font-bold text-foreground">CRM</span>
        </div>
        <div className="w-10" />
      </div>
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
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
      <VersionAnnouncementModal />
      <HelpButton pageTutorial={pageTutorial} pageKey={pageKey} key={location.pathname} />
    </div>
  );
};

export default DashboardLayout;
