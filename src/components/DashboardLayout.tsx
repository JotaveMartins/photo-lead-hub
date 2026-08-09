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
    if (path === "/inicio") return "inicio";
    if (path === "/" || path === "/leads") return "leads";
    if (path === "/tarefas") return "tarefas";
    if (path === "/relatorios") return "relatorios";
    if (path === "/catalogo" || path === "/servicos" || path === "/pacotes") return "catalogo";
    if (path === "/agenda") return "agenda";
    if (path === "/clientes" || path.startsWith("/clientes/")) return "clientes";
    if (path === "/entregas") return "entregas";
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
    if (path === "/estudio" || path.startsWith("/estudio/")) return "estudio";
    return "leads";
  };

  const PAGE_TITLES: Record<string, string> = {
    inicio: "Início",
    leads: "Leads",
    tarefas: "Tarefas",
    relatorios: "Relatórios",
    catalogo: "Serviços e Pacotes",
    agenda: "Agenda",
    clientes: "Clientes",
    entregas: "Entregas",
    anuncios: "Anúncios",
    contratos: "Contratos",
    financeiro: "Financeiro",
    "financeiro/cobrancas": "Cobranças",
    "financeiro/despesas": "Despesas",
    admin: "Admin",
    ia: "IA",
    whatsapp: "WhatsApp",
    inbox: "Inbox",
    integracoes: "Integrações",
    estudio: "Estúdio IA",
    "estudio/calendario": "Calendário de conteúdo",
  };
  const currentTitle = PAGE_TITLES[getActiveItem()] ?? "CRM";

  // Determine page-specific tutorial based on current route
  const { pageTutorial, pageKey } = useMemo(() => {
    const path = location.pathname;
    if (path === "/agenda") return { pageTutorial: agendaTutorial, pageKey: "agenda" };
    if (path === "/catalogo") return { pageTutorial: servicosTutorial, pageKey: "servicos" };
    if (path === "/financeiro/cobrancas") return { pageTutorial: cobrancasTutorial, pageKey: "cobrancas" };
    if (path === "/financeiro/despesas") return { pageTutorial: despesasTutorial, pageKey: "despesas" };
    if (path.startsWith("/clientes/") && path !== "/clientes") return { pageTutorial: clienteDetailTutorial, pageKey: "cliente-detail" };
    return { pageTutorial: undefined, pageKey: undefined };
  }, [location.pathname]);

  const handleItemClick = (item: string) => {
    const routes: Record<string, string> = {
      inicio: "/inicio",
      leads: "/leads",
      tarefas: "/tarefas",
      relatorios: "/relatorios",
      catalogo: "/catalogo",
      agenda: "/agenda",
      clientes: "/clientes",
      entregas: "/entregas",
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
      estudio: "/estudio",
      "estudio/calendario": "/estudio/calendario",
    };
    navigate(routes[item] || "/leads");
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className={`min-h-screen bg-background ${isImpersonating ? "pt-8" : ""}`}>
      {isImpersonating && (
        <div className="fixed top-0 inset-x-0 z-[60] h-8 flex items-center justify-between gap-3 px-4 bg-primary/15 backdrop-blur border-b border-primary/30">
          <span className="text-xs font-medium text-primary truncate">
            Visualizando como <strong>{impersonatedUserName}</strong>
          </span>
          <button
            onClick={handleStopImpersonation}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <X className="w-3 h-3" />
            Sair
          </button>
        </div>
      )}
      <Sidebar
        activeItem={getActiveItem()}
        onItemClick={handleItemClick}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2.5 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-md hover:bg-muted text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-display font-semibold text-base text-foreground truncate">
          {currentTitle}
        </h1>
        <div className="flex items-center justify-center w-11 h-11">
          <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
        </div>
      </div>
      <main className="lg:ml-64 px-3 py-4 sm:p-6 lg:p-8">
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-glow pointer-events-none opacity-50" />
        {children}
      </main>
      <TutorialModal />
      <VersionAnnouncementModal />
      <HelpButton pageTutorial={pageTutorial} pageKey={pageKey} key={location.pathname} />
    </div>
  );
};

export default DashboardLayout;
