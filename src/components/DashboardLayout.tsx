import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";

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
    if (path === "/" || path === "/dashboard") return "dashboard";
    if (path === "/leads") return "leads";
    if (path === "/agenda") return "agenda";
    if (path === "/mensagens") return "mensagens";
    if (path === "/relatorios") return "relatorios";
    return "dashboard";
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
    switch (item) {
      case "dashboard":
        navigate("/");
        break;
      case "leads":
        navigate("/leads");
        break;
      case "agenda":
        navigate("/agenda");
        break;
      case "mensagens":
        navigate("/mensagens");
        break;
      case "relatorios":
        navigate("/relatorios");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem={getActiveItem()} onItemClick={handleItemClick} />
      <main className="ml-64 p-6 lg:p-8">
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-glow pointer-events-none opacity-50" />
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
