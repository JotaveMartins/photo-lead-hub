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
  Home,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTodayClienteTasks, useAllPendingTasks } from "@/hooks/useLeadTasks";
import { useEvents } from "@/hooks/useEvents";
import { isToday, isBefore, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { useInboxTotalUnread } from "@/hooks/useInbox";
import { usePlanoBasico } from "@/hooks/usePlanoBasico";
import { CRM_VERSION } from "@/lib/version";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type MenuItem = { id: string; label: string; icon: any };
type MenuSection = { title: string; items: MenuItem[] };

const vendasItems: MenuItem[] = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
];

const clientesItems: MenuItem[] = [
  { id: 'clientes', label: 'Clientes', icon: UserCheck },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
  { id: 'pacotes', label: 'Pacotes', icon: Package },
  { id: 'equipe', label: 'Equipe', icon: HardHat },
];

const financeiroItems: MenuItem[] = [
  { id: 'financeiro', label: 'Dashboard', icon: DollarSign },
  { id: 'financeiro/cobrancas', label: 'Cobranças', icon: Receipt },
  { id: 'financeiro/despesas', label: 'Despesas', icon: TrendingDown },
];

const configItems: MenuItem[] = [
  { id: 'ia', label: 'IA', icon: Bot },
  { id: 'integracoes', label: 'Integrações', icon: Plug },
];

const adminMenuItems: MenuItem[] = [
  { id: 'anuncios', label: 'Anúncios', icon: Megaphone },
  { id: 'admin', label: 'Clientes', icon: UserCog },
];

const Sidebar = ({ activeItem, onItemClick, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { data: clienteTasksToday = [] } = useTodayClienteTasks();
  const { data: allPending = [] } = useAllPendingTasks();
  const { data: events = [] } = useEvents();
  const { data: inboxUnread = 0 } = useInboxTotalUnread();
  const planoBasico = usePlanoBasico();
  const clienteBadge = clienteTasksToday.length;
  const today = startOfDay(new Date());
  const tarefasBadge = allPending.filter((t) => {
    const d = parseLocalDate(t.due_date);
    return isToday(d) || isBefore(d, today);
  }).length;
  const agendaBadge = events.filter((e: any) => isToday(new Date(e.data_evento))).length;

  const handleItemClick = (id: string) => {
    onItemClick(id);
    onMobileClose?.();
  };

  const badgeFor = (id: string): number => {
    if (id === 'clientes') return clienteBadge;
    if (id === 'tarefas') return tarefasBadge;
    if (id === 'agenda') return agendaBadge;
    if (id === 'inbox') return inboxUnread;
    return 0;
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    const badgeCount = badgeFor(item.id);
    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
          ${isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
      >
        <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-primary'}`} />
        <span className="flex-1 text-left">{item.label}</span>
        {badgeCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
    );
  };

  const renderSection = (title: string, items: MenuItem[]) => (
    <div className="pt-3 first:pt-0">
      <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>
      <div className="space-y-0.5">{items.map(renderItem)}</div>
    </div>
  );

  const configFiltered = configItems.filter((i) => !(planoBasico && i.id === 'ia'));

  const sections: { key: string; title: string; items: MenuItem[] }[] = [
    { key: 'vendas', title: 'Vendas', items: vendasItems },
    { key: 'clientes', title: 'Clientes', items: clientesItems },
    { key: 'financeiro', title: 'Financeiro', items: financeiroItems },
    { key: 'config', title: 'Configurações', items: configFiltered },
  ];

  const STORAGE_KEY = 'sidebar-open-sections-v2';
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { vendas: true, clientes: true, financeiro: true, config: false };
  });

  // Auto-open section containing active route
  useEffect(() => {
    const activeSection = sections.find((s) => s.items.some((i) => i.id === activeItem));
    if (activeSection && !openSections[activeSection.key]) {
      setOpenSections((prev) => ({ ...prev, [activeSection.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
    } catch {}
  }, [openSections]);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderCollapsibleSection = (
    key: string,
    title: string,
    items: MenuItem[],
  ) => {
    const isOpen = !!openSections[key];
    const sectionBadge = items.reduce((sum, i) => sum + badgeFor(i.id), 0);
    const hasActive = items.some((i) => i.id === activeItem);
    return (
      <div key={key} className="pt-3 first:pt-0">
        <button
          onClick={() => toggleSection(key)}
          className={`w-full flex items-center gap-2 px-4 py-1.5 rounded-md transition-colors
            ${hasActive ? 'text-foreground' : 'text-muted-foreground/70 hover:text-foreground'}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-1 text-left">
            {title}
          </span>
          {!isOpen && sectionBadge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
              {sectionBadge > 99 ? '99+' : sectionBadge}
            </span>
          )}
        </button>
        {isOpen && <div className="space-y-0.5 mt-1">{items.map(renderItem)}</div>}
      </div>
    );
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
        className={`fixed left-0 top-0 h-[100dvh] w-[82%] max-w-[280px] lg:w-64 lg:max-w-none bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-200 ease-out shadow-2xl lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="p-4 lg:p-6 border-b border-sidebar-border">
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

       <nav className="flex-1 p-3 overflow-y-auto">
          {renderItem({ id: 'inicio', label: 'Início', icon: Home })}
          {sections.map((s) => renderCollapsibleSection(s.key, s.title, s.items))}
       </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        {/* Admin items - at the bottom */}
        {isAdmin && adminMenuItems.map((item) => {
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
        <div className="px-4 pt-1 text-[11px] font-medium text-muted-foreground/70">
          CRM v{CRM_VERSION}
        </div>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
