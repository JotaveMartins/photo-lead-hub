 import { Toaster } from "@/components/ui/toaster";
 import IAPage from "./pages/IAPage";
 import WhatsAppConfigPage from "./pages/WhatsAppConfigPage";
import IntegracoesPage from "./pages/IntegracoesPage";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import DashboardLayout from "@/components/DashboardLayout";
import Auth from "./pages/Auth";
import LeadsPage from "./pages/LeadsPage";
import TarefasPage from "./pages/TarefasPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import DespesasPage from "./pages/DespesasPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import FinanceiroResumoPage from "./pages/FinanceiroResumoPage";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import CatalogoPage from "./pages/CatalogoPage";
import AgendaPage from "./pages/AgendaPage";
import EquipePage from "./pages/EquipePage";
import AnunciosPage from "./pages/AnunciosPage";
import InboxPage from "./pages/InboxPage";
import ContratosPage from "./pages/ContratosPage";
import InicioPage from "./pages/InicioPage";
import EntregasPage from "./pages/EntregasPage";
import { useWhatsAppDisconnectAlert } from "@/hooks/useWhatsAppDisconnectAlert";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

const WhatsAppDisconnectWatcher = () => {
  useWhatsAppDisconnectAlert();
  return null;
};

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <WhatsAppDisconnectWatcher />
      <Outlet />
    </DashboardLayout>
  );
};

const AdminProtectedLayout = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();

  if (loading || isRoleLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/leads" replace />;

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/inicio" replace />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/inicio" element={<InicioPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/tarefas" element={<TarefasPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/servicos" element={<Navigate to="/catalogo" replace />} />
        <Route path="/pacotes" element={<Navigate to="/catalogo" replace />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:id" element={<ClienteDetailPage />} />
        <Route path="/entregas" element={<EntregasPage />} />
        <Route path="/equipe" element={<EquipePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/ia" element={<IAPage />} />
        <Route path="/whatsapp" element={<WhatsAppConfigPage />} />
        <Route path="/integracoes" element={<IntegracoesPage />} />
        <Route path="/contratos" element={<ContratosPage />} />
        <Route path="/financeiro/cobrancas" element={<FinanceiroPage />} />
        <Route path="/financeiro/despesas" element={<DespesasPage />} />
        <Route path="/financeiro" element={<FinanceiroResumoPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route element={<AdminProtectedLayout />}>
        <Route path="/anuncios" element={<AnunciosPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <AppRoutes />
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
