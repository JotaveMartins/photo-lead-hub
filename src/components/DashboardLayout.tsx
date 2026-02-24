import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import { TutorialModal, HelpButton } from "@/components/TutorialModal";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get active menu item from path
  const getActiveItem = () => {
    const path = location.pathname;
    if (path === "/" || path === "/leads") return "leads";
    if (path === "/tarefas") return "tarefas";
    if (path === "/relatorios") return "relatorios";
    if (path === "/servicos") return "servicos";
    if (path === "/pacotes") return "pacotes";
    if (path === "/agenda") return "agenda";
    if (path === "/financeiro") return "financeiro";
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
      financeiro: "/financeiro",
      admin: "/admin",
    };
    navigate(routes[item] || "/leads");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem={getActiveItem()} onItemClick={handleItemClick} />
      <main className="ml-64 p-6 lg:p-8">
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-glow pointer-events-none opacity-50" />
        {children}
      </main>
      <TutorialModal />
      <HelpButton />
    </div>
  );
};

export default DashboardLayout;
