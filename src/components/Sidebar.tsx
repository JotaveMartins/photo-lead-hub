import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  LogOut,
  Wrench,
  Package
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
  { id: 'pacotes', label: 'Pacotes', icon: Package },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  { id: 'relatorios', label: 'Relatórios', icon: TrendingUp },
];

const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  const { signOut } = useAuth();

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

      <nav className="flex-1 p-4 space-y-1">
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
