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
  FileText,
  X,
  HardHat,
   Megaphone,
   Bot,
  MessageSquare,
  Inbox,
  Plug,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTodayClienteTasks, useAllPendingTasks } from "@/hooks/useLeadTasks";
import { useEvents } from "@/hooks/useEvents";
import { isToday, isBefore, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { useState } from "react";
import { useInboxTotalUnread } from "@/hooks/useInbox";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const baseMenuItems = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
  { id: 'pacotes', label: 'Pacotes', icon: Package },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'clientes', label: 'Clientes', icon: UserCheck },
  { id: 'equipe', label: 'Equipe', icon: HardHat },
  { id: 'contratos', label: 'Contratos', icon: FileText },
];

const financeiroSubItems = [
  { id: 'financeiro/cobrancas', label: 'Cobranças', icon: Receipt },
  { id: 'financeiro/despesas', label: 'Despesas', icon: TrendingDown },
];

 const adminMenuItems = [
   { id: 'anuncios', label: 'Anúncios', icon: Megaphone },
   { id: 'admin', label: 'Clientes', icon: UserCog },
 ];

 const configMenuItems = [
   { id: 'inbox', label: 'Inbox', icon: Inbox },
   { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
   { id: 'ia', label: 'IA', icon: Bot },
   { id: 'integracoes', label: 'Integrações', icon: Plug },
 ];

const Sidebar = ({ activeItem, onItemClick, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { data: clienteTasksToday = [] } = useTodayClienteTasks();
  const { data: allPending = [] } = useAllPendingTasks();
  const { data: events = [] } = useEvents();
  const { data: inboxUnread = 0 } = useInboxTotalUnread();
  const clienteBadge = clienteTasksToday.length;
  const today = startOfDay(new Date());
  const tarefasBadge = allPending.filter((t) => {
    const d = parseLocalDate(t.due_date);
    return isToday(d) || isBefore(d, today);
  }).length;
  const agendaBadge = events.filter((e: any) => isToday(new Date(e.data_evento))).length;
  const isFinanceiroActive = activeItem.startsWith('financeiro');
  const [financeiroOpen, setFinanceiroOpen] = useState(isFinanceiroActive);

  const menuItems = baseMenuItems;
  const showFinanceiro = true;
   const showAdmin = isAdmin;
   const showConfig = true; // All photographers should see config

  const handleItemClick = (id: string) => {
    onItemClick(id);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-screen w-[78%] max-w-[260px] lg:w-64 lg:max-w-none bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-200 ease-out shadow-2xl lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-foreground">CRM</h1>
                <p className="text-xs text-muted-foreground">Hub do Fotógrafo</p>
              </div>
            </div>
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

       <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
         {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          let badgeCount = 0;
          if (item.id === 'clientes') badgeCount = clienteBadge;
          else if (item.id === 'tarefas') badgeCount = tarefasBadge;
          else if (item.id === 'agenda') badgeCount = agendaBadge;
          const showBadge = badgeCount > 0;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}

         {/* Configurações group */}
         {showConfig && configMenuItems.map((item) => {
           const Icon = item.icon;
           const isActive = activeItem === item.id;
           const badgeCount = item.id === 'inbox' ? inboxUnread : 0;
           return (
             <button
               key={item.id}
               onClick={() => handleItemClick(item.id)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                 ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
             >
               <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
               <span className="flex-1 text-left">{item.label}</span>
               {badgeCount > 0 && (
                 <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                   {badgeCount > 99 ? "99+" : badgeCount}
                 </span>
               )}
             </button>
           );
         })}

         {/* Financeiro expandable group */}
         {showFinanceiro && (
          <div>
            <div className="flex items-center">
              <button
                onClick={() => handleItemClick('financeiro')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-l-lg text-sm font-medium transition-all duration-200 group
                  ${activeItem === 'financeiro' ? 'bg-primary text-primary-foreground shadow-glow' : isFinanceiroActive ? 'text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <DollarSign className={`w-5 h-5 ${activeItem === 'financeiro' || isFinanceiroActive ? '' : 'group-hover:text-primary'}`} />
                Financeiro
              </button>
              <button
                onClick={() => setFinanceiroOpen(!financeiroOpen)}
                className={`px-2 py-3 rounded-r-lg text-sm transition-all duration-200
                  ${activeItem === 'financeiro' ? 'bg-primary text-primary-foreground' : isFinanceiroActive ? 'text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${financeiroOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {financeiroOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {financeiroSubItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
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

      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        {/* Admin items - at the bottom */}
        {showAdmin && adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
