import { 
  Users, 
  CheckSquare,
  LogOut,
  UserCog,
  BarChart3,
  Wrench,
  Package,
  Calendar,
  DollarSign,
  UserCheck,
  ChevronDown,
  Receipt,
  TrendingDown,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const baseMenuItems = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
  { id: 'pacotes', label: 'Pacotes', icon: Package },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
];

const financeiroSubItems = [
  { id: 'financeiro/cobrancas', label: 'Cobranças', icon: Receipt },
  { id: 'financeiro/despesas', label: 'Despesas', icon: TrendingDown },
];

const adminMenuItems = [
  { id: 'admin', label: 'Clientes', icon: UserCog },
];

const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isFinanceiroActive = activeItem.startsWith('financeiro');
  const [financeiroOpen, setFinanceiroOpen] = useState(isFinanceiroActive);

  const menuItems = isAdmin ? baseMenuItems : baseMenuItems;
  const showFinanceiro = isAdmin;
  const showAdmin = isAdmin;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">CRM</h1>
            <p className="text-xs text-muted-foreground">Hub do Fotógrafo</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
              {item.label}
            </button>
          );
        })}

        {/* Financeiro expandable group */}
        {showFinanceiro && (
          <div>
            <button
              onClick={() => setFinanceiroOpen(!financeiroOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isFinanceiroActive ? 'text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <DollarSign className={`w-5 h-5 ${isFinanceiroActive ? 'text-primary' : 'group-hover:text-primary'}`} />
              Financeiro
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${financeiroOpen ? 'rotate-180' : ''}`} />
            </button>
            {financeiroOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {financeiroSubItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                        ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? '' : 'group-hover:text-primary'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin items */}
        {showAdmin && adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
