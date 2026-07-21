import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Users, UserCheck, Calendar, Receipt, TrendingDown } from "lucide-react";
import { useAllPendingTasks } from "@/hooks/useLeadTasks";
import { useEvents } from "@/hooks/useEvents";
import { useAllCobrancas } from "@/hooks/useCobrancas";
import { useDespesas } from "@/hooks/useDespesas";
import { parseLocalDate } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, isWithinInterval, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SectionCard = ({
  title,
  icon: Icon,
  onSeeAll,
  headerRight,
  children,
}: {
  title: string;
  icon: any;
  onSeeAll?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 flex flex-col min-h-[220px]">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {headerRight}
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver todos
          </button>
        )}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
      {children}
    </div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>
);

const TaskRow = ({
  title,
  subtitle,
  due,
}: {
  title: string;
  subtitle?: string | null;
  due: string;
}) => {
  const d = parseLocalDate(due);
  const overdue = !isToday(d) && d < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <span
        className={`text-[11px] font-semibold whitespace-nowrap ${
          overdue ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {format(d, "dd/MM", { locale: ptBR })}
      </span>
    </div>
  );
};

const InicioPage = () => {
  const navigate = useNavigate();
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
  const totalRecebimentos = weekCobrancas.reduce((s, c) => s + Number(c.valor || 0), 0);

  const weekDespesas = despesas.filter((d) => {
    const dt = parseLocalDate(d.data);
    return isWithinInterval(dt, { start: weekStart, end: weekEnd });
  });
  const totalDespesas = weekDespesas.reduce((s, d) => s + Number(d.valor || 0), 0);

  const weekLabel = `${format(weekStart, "dd/MM", { locale: ptBR })} a ${format(
    weekEnd,
    "dd/MM",
    { locale: ptBR }
  )}`;

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Início
        </h1>
        <p className="text-sm text-muted-foreground">
          Semana de {weekLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard
          title="Tarefas de hoje — Clientes"
          icon={UserCheck}
          onSeeAll={() => navigate("/tarefas")}
          headerRight={
            <span className="text-xs font-semibold text-foreground">
              {todayClienteTasks.length}
            </span>
          }
        >
          {todayClienteTasks.length === 0 ? (
            <EmptyState text="Nenhuma tarefa de cliente para hoje." />
          ) : (
            todayClienteTasks.map((t) => (
              <TaskRow
                key={t.id}
                title={t.title}
                subtitle={t.clientes?.nome ?? undefined}
                due={t.due_date}
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Tarefas de hoje — Leads"
          icon={Users}
          onSeeAll={() => navigate("/tarefas")}
          headerRight={
            <span className="text-xs font-semibold text-foreground">
              {todayLeadTasks.length}
            </span>
          }
        >
          {todayLeadTasks.length === 0 ? (
            <EmptyState text="Nenhuma tarefa de lead para hoje." />
          ) : (
            todayLeadTasks.map((t) => (
              <TaskRow
                key={t.id}
                title={t.title}
                subtitle={t.leads?.nome ?? undefined}
                due={t.due_date}
              />
            ))
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Agenda da semana"
          icon={Calendar}
          onSeeAll={() => navigate("/agenda")}
          headerRight={
            <span className="text-xs font-semibold text-foreground">
              {weekEvents.length}
            </span>
          }
        >
          {weekEvents.length === 0 ? (
            <EmptyState text="Sem eventos nesta semana." />
          ) : (
            weekEvents.map((e: any) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {e.titulo}
                  </p>
                  {e.clientes?.nome && (
                    <p className="text-xs text-muted-foreground truncate">
                      {e.clientes.nome}
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  {format(new Date(e.data_evento), "EEE dd/MM HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Recebimentos da semana"
          icon={Receipt}
          onSeeAll={() => navigate("/financeiro/cobrancas")}
          headerRight={
            <span className="text-xs font-semibold text-primary">
              {brl(totalRecebimentos)}
            </span>
          }
        >
          {weekCobrancas.length === 0 ? (
            <EmptyState text="Nenhum recebimento nesta semana." />
          ) : (
            weekCobrancas.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40"
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
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Despesas da semana"
          icon={TrendingDown}
          onSeeAll={() => navigate("/financeiro/despesas")}
          headerRight={
            <span className="text-xs font-semibold text-destructive">
              {brl(totalDespesas)}
            </span>
          }
        >
          {weekDespesas.length === 0 ? (
            <EmptyState text="Nenhuma despesa nesta semana." />
          ) : (
            weekDespesas.map((d) => (
              <div
                key={d.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseLocalDate(d.data), "dd/MM", { locale: ptBR })}{" "}
                    · {d.categoria}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {brl(Number(d.valor || 0))}
                </span>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default InicioPage;