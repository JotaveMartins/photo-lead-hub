import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Users,
  UserCheck,
  Calendar,
  Receipt,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useAllPendingTasks } from "@/hooks/useLeadTasks";
import { useEvents } from "@/hooks/useEvents";
import { useAllCobrancas } from "@/hooks/useCobrancas";
import { useDespesas } from "@/hooks/useDespesas";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

const KpiCard = ({
  label,
  value,
  icon: Icon,
  tone = "primary",
  onClick,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: "primary" | "accent" | "success" | "danger";
  onClick?: () => void;
  delay?: number;
}) => {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-status-success/10 text-status-success",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group text-left w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-display font-bold text-foreground group-hover:text-gradient transition-all truncate">
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-lg ${toneMap[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Icon className="w-8 h-8 text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const CardShell = ({
  title,
  icon: Icon,
  right,
  onSeeAll,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  icon: any;
  right?: React.ReactNode;
  onSeeAll?: () => void;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <div
    style={{ animationDelay: `${delay}ms` }}
    className={`bg-card border border-border rounded-xl flex flex-col animate-fade-in ${className}`}
  >
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-3">
        {right}
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
    <div className="p-4 flex-1">{children}</div>
  </div>
);

const TaskRow = ({
  title,
  subtitle,
  due,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  due: string;
  onClick?: () => void;
}) => {
  const d = parseLocalDate(due);
  const overdue =
    !isToday(d) && d < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
        {initials(subtitle || title)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <span
        className={`text-[11px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full ${
          overdue
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {format(d, "dd/MM", { locale: ptBR })}
      </span>
    </button>
  );
};

const InicioPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { data: effectiveProfile } = useQuery({
    queryKey: ["profile-nome", effectiveUserId],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("user_id", effectiveUserId!)
        .maybeSingle();
      return data;
    },
  });
  const { data: pending = [] } = useAllPendingTasks();
  const { data: events = [] } = useEvents();
  const { data: cobrancas = [] } = useAllCobrancas();
  const { data: despesas = [] } = useDespesas();

  const now = new Date();
  const weekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), []);
  const weekEnd = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), []);
  const todayStr = format(now, "yyyy-MM-dd");

  const todayLeadTasks = pending.filter(
    (t) => t.lead_id && !t.cliente_id && t.due_date <= todayStr
  );
  const todayClienteTasks = pending.filter(
    (t) => t.cliente_id && t.due_date <= todayStr
  );

  const weekEvents = (events as any[]).filter((e) => {
    const d = new Date(e.data_evento);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const weekCobrancas = cobrancas.filter((c) => {
    const d = parseLocalDate(c.vencimento);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });
  const totalRecebimentos = weekCobrancas.reduce(
    (s, c) => s + Number(c.valor || 0),
    0
  );
  const recebidoRealizado = weekCobrancas
    .filter((c) => c.status === "paga")
    .reduce((s, c) => s + Number(c.valor || 0), 0);
  const recebidoPrevisto = totalRecebimentos - recebidoRealizado;

  const weekDespesas = despesas.filter((d) => {
    const dt = parseLocalDate(d.data);
    return isWithinInterval(dt, { start: weekStart, end: weekEnd });
  });
  const totalDespesas = weekDespesas.reduce(
    (s, d) => s + Number(d.valor || 0),
    0
  );
  const despesaRealizada = weekDespesas
    .filter((d) => d.status === "paga")
    .reduce((s, d) => s + Number(d.valor || 0), 0);
  const despesaPrevista = totalDespesas - despesaRealizada;
  const saldoReal = recebidoRealizado - despesaRealizada;
  const saldoPrevisto = totalRecebimentos - totalDespesas;

  const nome =
    (effectiveProfile?.nome as string | undefined)?.split(" ")[0] ||
    (user?.user_metadata as any)?.nome?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  const weekLabel = `${format(weekStart, "dd 'de' MMM", {
    locale: ptBR,
  })} — ${format(weekEnd, "dd 'de' MMM", { locale: ptBR })}`;

  // Group events by date
  const eventsByDay = weekEvents.reduce<Record<string, any[]>>((acc, e) => {
    const key = format(new Date(e.data_evento), "yyyy-MM-dd");
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});
  const eventDayKeys = Object.keys(eventsByDay).sort();

  const [taskTab, setTaskTab] = useState<"clientes" | "leads">("leads");
  const activeTasks =
    taskTab === "clientes" ? todayClienteTasks : todayLeadTasks;

  const openTask = (t: any) => {
    if (t.cliente_id) navigate(`/clientes/${t.cliente_id}?tab=tarefas`);
    else if (t.lead_id) navigate(`/leads?open=${t.lead_id}`);
  };

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 h-64 bg-gradient-glow pointer-events-none -z-0"
        aria-hidden
      />

      <div className="relative z-10">
        {/* Hero */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap animate-fade-in">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {greeting()}
              {nome ? (
                <>
                  , <span className="text-gradient">{nome}</span>
                </>
              ) : (
                ""
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aqui está o resumo da sua semana ({weekLabel})
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard
            label="Tarefas hoje"
            value={todayClienteTasks.length + todayLeadTasks.length}
            icon={CheckSquare}
            tone="primary"
            onClick={() => navigate("/tarefas?filter=hoje")}
            delay={0}
          />
          <KpiCard
            label="Eventos na semana"
            value={weekEvents.length}
            icon={Calendar}
            tone="accent"
            onClick={() => navigate("/agenda")}
            delay={60}
          />
          <KpiCard
            label="A receber"
            value={brl(totalRecebimentos)}
            icon={Receipt}
            tone="success"
            onClick={() => navigate("/financeiro/cobrancas")}
            delay={120}
          />
          <KpiCard
            label="A pagar"
            value={brl(totalDespesas)}
            icon={TrendingDown}
            tone="danger"
            onClick={() => navigate("/financeiro/despesas")}
            delay={180}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tasks card with tabs */}
          <CardShell
            title="Tarefas de hoje"
            icon={CheckSquare}
            onSeeAll={() => navigate("/tarefas?filter=hoje")}
            delay={220}
            right={
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60">
                <button
                  onClick={() => setTaskTab("leads")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    taskTab === "leads"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3 h-3" /> Leads
                  <span className="text-[10px] font-bold text-primary">
                    {todayLeadTasks.length}
                  </span>
                </button>
                <button
                  onClick={() => setTaskTab("clientes")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    taskTab === "clientes"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserCheck className="w-3 h-3" /> Clientes
                  <span className="text-[10px] font-bold text-primary">
                    {todayClienteTasks.length}
                  </span>
                </button>
              </div>
            }
          >
            <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
              {activeTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  text={
                    taskTab === "clientes"
                      ? "Nenhuma tarefa de cliente para hoje."
                      : "Nenhuma tarefa de lead para hoje."
                  }
                />
              ) : (
                activeTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    title={t.title}
                    subtitle={
                      (t.clientes?.nome ?? t.leads?.nome) ?? undefined
                    }
                    due={t.due_date}
                    onClick={() => openTask(t)}
                  />
                ))
              )}
            </div>
          </CardShell>

          {/* Agenda timeline */}
          <CardShell
            title="Agenda da semana"
            icon={Calendar}
            onSeeAll={() => navigate("/agenda")}
            delay={280}
            right={
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {weekEvents.length}
              </span>
            }
          >
            {weekEvents.length === 0 ? (
              <EmptyState icon={Calendar} text="Sem eventos nesta semana." />
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1 relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
                {eventDayKeys.map((key) => {
                  const items = eventsByDay[key];
                  const d = new Date(key + "T00:00:00");
                  return (
                    <div key={key} className="relative pl-11 pb-4 last:pb-0">
                      <div className="absolute left-0 top-0 w-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center border border-primary/20">
                          <span className="text-[9px] font-semibold uppercase leading-none">
                            {format(d, "EEE", { locale: ptBR })}
                          </span>
                          <span className="text-sm font-bold leading-none mt-0.5">
                            {format(d, "dd")}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((e: any) => (
                          <button
                            key={e.id}
                            onClick={() => navigate(`/agenda?open=${e.id}`)}
                            className="w-full text-left p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {e.titulo}
                              </p>
                              <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                {format(new Date(e.data_evento), "HH:mm")}
                              </span>
                            </div>
                            {e.clientes?.nome && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {e.clientes.nome}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardShell>
        </div>

        {/* Finance card */}
        <div
          className="mt-4 bg-card border border-border rounded-xl animate-fade-in"
          style={{ animationDelay: "340ms" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-foreground">
                Financeiro da semana
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Saldo real
                </p>
                <p
                  className={`text-sm font-bold ${
                    saldoReal >= 0 ? "text-status-success" : "text-destructive"
                  }`}
                  title="Recebimentos pagos − despesas pagas"
                >
                  {brl(saldoReal)}
                </p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Saldo previsto
                </p>
                <p
                  className={`text-sm font-bold ${
                    saldoPrevisto >= 0
                      ? "text-status-success/80"
                      : "text-destructive/80"
                  }`}
                  title="Total previsto de recebimentos − total previsto de despesas"
                >
                  {brl(saldoPrevisto)}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {/* Recebimentos */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-status-success" />
                  <p className="text-sm font-semibold text-foreground">
                    Recebimentos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-status-success leading-tight">
                    {brl(recebidoRealizado)}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    + {brl(recebidoPrevisto)} a receber
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {weekCobrancas.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    text="Nenhum recebimento nesta semana."
                  />
                ) : (
                  weekCobrancas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        navigate(
                          `/financeiro/cobrancas?open=${c.id}&date=${c.vencimento}`
                        )
                      }
                      className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.descricao || "Cobrança"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseLocalDate(c.vencimento), "dd/MM", {
                            locale: ptBR,
                          })}{" "}
                          · {c.status}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {brl(Number(c.valor || 0))}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Despesas */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <p className="text-sm font-semibold text-foreground">
                    Despesas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive leading-tight">
                    {brl(despesaRealizada)}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    + {brl(despesaPrevista)} a pagar
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {weekDespesas.length === 0 ? (
                  <EmptyState
                    icon={TrendingDown}
                    text="Nenhuma despesa nesta semana."
                  />
                ) : (
                  weekDespesas.map((d) => (
                    <button
                      key={d.id}
                      onClick={() =>
                        navigate(
                          `/financeiro/despesas?open=${d.id}&date=${d.data}`
                        )
                      }
                      className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {d.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseLocalDate(d.data), "dd/MM", {
                            locale: ptBR,
                          })}{" "}
                          · {d.categoria}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {brl(Number(d.valor || 0))}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InicioPage;