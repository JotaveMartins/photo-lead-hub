import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings,
  TrendingUp,
  LogOut
} from "lucide-react";
import logo from "@/assets/logo.png";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'calendar', label: 'Agenda', icon: Calendar },
  { id: 'messages', label: 'Mensagens', icon: MessageSquare },
  { id: 'analytics', label: 'Relatórios', icon: TrendingUp },
];

const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">CRM</h1>
            <p className="text-xs text-muted-foreground">Gestão de Leads</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-glow' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => onItemClick('settings')}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
            transition-all duration-200 group
            ${activeItem === 'settings' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }
          `}
        >
          <Settings className="w-5 h-5" />
          Configurações
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
            text-muted-foreground hover:text-destructive hover:bg-destructive/10
            transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
