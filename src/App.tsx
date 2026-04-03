import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import DashboardLayout from "@/components/DashboardLayout";
import Auth from "./pages/Auth";
import LeadsPage from "./pages/LeadsPage";
import TarefasPage from "./pages/TarefasPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import ComingSoon from "./components/ComingSoon";
import DespesasPage from "./pages/DespesasPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import ServicosPage from "./pages/ServicosPage";
import PacotesPage from "./pages/PacotesPage";
import AgendaPage from "./pages/AgendaPage";
import { BarChart3, Wrench, Package, Calendar, DollarSign, FileText } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/leads" replace />} />
      <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
      <Route path="/tarefas" element={<ProtectedRoute><TarefasPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><RelatoriosPage /></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute><ServicosPage /></ProtectedRoute>} />
      <Route path="/pacotes" element={<ProtectedRoute><PacotesPage /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
      <Route path="/contratos" element={<ProtectedRoute><ComingSoon title="Contratos" icon={<FileText className="w-10 h-10" />} /></ProtectedRoute>} />
      <Route path="/clientes/:id" element={<ProtectedRoute><ClienteDetailPage /></ProtectedRoute>} />
      <Route path="/financeiro/cobrancas" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
      <Route path="/financeiro/despesas" element={<ProtectedRoute><ComingSoon title="Despesas" icon={<DollarSign className="w-10 h-10" />} /></ProtectedRoute>} />
      <Route path="/financeiro" element={<Navigate to="/financeiro/cobrancas" replace />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
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
