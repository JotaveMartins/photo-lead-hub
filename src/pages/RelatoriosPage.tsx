import { useState, useMemo } from "react";
import { BarChart3, Users, PhoneCall, FileText, Send, Trophy, XCircle, DollarSign, TrendingUp, Percent } from "lucide-react";
import { useReportData, type ReportLead } from "@/hooks/useReportData";
import ReportFilters, { PeriodOption, getDateRange } from "@/components/reports/ReportFilters";
import FunnelChart from "@/components/reports/FunnelChart";
import ReportDrillDown from "@/components/reports/ReportDrillDown";

import RevenueSection from "@/components/reports/RevenueSection";
import ConversionTimeSection from "@/components/reports/ConversionTimeSection";
import ConversionDrillDown, { type ConversionItem } from "@/components/reports/ConversionDrillDown";
import LossSection from "@/components/reports/LossSection";
import TasksSection from "@/components/reports/TasksSection";
import MetaAdsSection from "@/components/reports/MetaAdsSection";
import RevenueCompositionSection from "@/components/reports/RevenueCompositionSection";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

type DrillDown = {
  title: string;
  leads: ReportLead[];
  dateField: keyof ReportLead;
  dateLabel: string;
} | null;

const RelatoriosPage = () => {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [origem, setOrigem] = useState("");
  const [interesse, setInteresse] = useState("");
  const [clienteUserId, setClienteUserId] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDown>(null);
  const [conversionDrill, setConversionDrill] = useState<{
    title: string;
    startLabel: string;
    endLabel: string;
    items: ConversionItem[];
    averageDays: number | null;
  } | null>(null);

  const { leads: allLeads, tasks, profiles, isLoading, isAdmin } = useReportData({ clienteUserId });

  const dateRange = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  // Unique origens (computed from the unfiltered set so the dropdown always shows all options)
  const origens = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach((l) => { if (l.origem) set.add(l.origem); });
    return Array.from(set).sort();
  }, [allLeads]);

  // Unique interesses (computed from the unfiltered set so the dropdown always shows all options)
  const interesses = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach((l) => { if (l.interesse) set.add(l.interesse); });
    return Array.from(set).sort();
  }, [allLeads]);

  // Apply origem/interesse filters client-side so changing them does not collapse the dropdown options
  const leads = useMemo(() => {
    return allLeads.filter((l) => {
      if (origem && l.origem !== origem) return false;
      if (interesse && l.interesse !== interesse) return false;
      return true;
    });
  }, [allLeads, origem, interesse]);

  // Helper: check if a timestamp falls within the selected period
  const inRange = (ts: string | null) => {
    if (!ts) return false;
    const d = new Date(ts);
    return d >= dateRange.start && d < dateRange.end;
  };

  // === Filtered lead sets (reusable for drill-down) ===
  const leadSets = useMemo(() => ({
    created: leads.filter((l) => inRange(l.created_at)),
    contato: leads.filter((l) => inRange(l.data_entrada_contato_iniciado)),
    propostas: leads.filter((l) => inRange(l.data_entrada_proposta_enviada)),
    contratos: leads.filter((l) => inRange(l.data_entrada_contrato_enviado)),
    ganhos: leads.filter((l) => inRange(l.data_entrada_fechado_ganho)),
    perdidos: leads.filter((l) => inRange(l.data_entrada_fechado_perdido)),
  }), [leads, dateRange]);

  // === KPIs ===
  const kpis = useMemo(() => {
    const receitaLeads = leadSets.ganhos.filter((l) => l.valor);
    const receita = receitaLeads.reduce((s, l) => s + (l.valor || 0), 0);
    const ticket = leadSets.ganhos.length > 0 ? receita / leadSets.ganhos.length : 0;
    const taxa = leadSets.created.length > 0 ? (leadSets.ganhos.length / leadSets.created.length) * 100 : 0;

    return {
      created: leadSets.created.length,
      contato: leadSets.contato.length,
      propostas: leadSets.propostas.length,
      contratos: leadSets.contratos.length,
      ganhos: leadSets.ganhos.length,
      perdidos: leadSets.perdidos.length,
      receita, ticket, taxa,
    };
  }, [leadSets]);

  // === Funnel ===
  const funnelSteps = useMemo(() => [
    { label: "Leads", value: kpis.created },
    { label: "Contato Iniciado", value: kpis.contato },
    { label: "Proposta", value: kpis.propostas },
    { label: "Contrato Enviado", value: kpis.contratos },
    { label: "Ganho", value: kpis.ganhos },
  ], [kpis]);

  const handleFunnelClick = (label: string) => {
    const map: Record<string, { leads: ReportLead[]; dateField: keyof ReportLead; dateLabel: string }> = {
      "Leads": { leads: leadSets.created, dateField: "created_at", dateLabel: "Criado em" },
      "Contato Iniciado": { leads: leadSets.contato, dateField: "data_entrada_contato_iniciado", dateLabel: "Contato em" },
      "Proposta": { leads: leadSets.propostas, dateField: "data_entrada_proposta_enviada", dateLabel: "Proposta em" },
      "Contrato Enviado": { leads: leadSets.contratos, dateField: "data_entrada_contrato_enviado", dateLabel: "Contrato em" },
      "Ganho": { leads: leadSets.ganhos, dateField: "data_entrada_fechado_ganho", dateLabel: "Ganho em" },
    };
    const item = map[label];
    if (item) setDrillDown({ title: label, ...item });
  };

  const handleKpiClick = (key: string) => {
    const map: Record<string, { title: string; leads: ReportLead[]; dateField: keyof ReportLead; dateLabel: string }> = {
      "Leads Criados": { title: "Leads Criados", leads: leadSets.created, dateField: "created_at", dateLabel: "Criado em" },
      "Contato Iniciado": { title: "Contato Iniciado", leads: leadSets.contato, dateField: "data_entrada_contato_iniciado", dateLabel: "Contato em" },
      "Propostas": { title: "Propostas Enviadas", leads: leadSets.propostas, dateField: "data_entrada_proposta_enviada", dateLabel: "Proposta em" },
      "Contratos Enviados": { title: "Contratos Enviados", leads: leadSets.contratos, dateField: "data_entrada_contrato_enviado", dateLabel: "Contrato em" },
      "Ganhos": { title: "Negócios Ganhos", leads: leadSets.ganhos, dateField: "data_entrada_fechado_ganho", dateLabel: "Ganho em" },
      "Perdidos": { title: "Negócios Perdidos", leads: leadSets.perdidos, dateField: "data_entrada_fechado_perdido", dateLabel: "Perdido em" },
    };
    const item = map[key];
    if (item) setDrillDown(item);
  };

  // === Revenue daily ===
  const bucketHelpers = useMemo(() => {
    const spanDays = (dateRange.end.getTime() - dateRange.start.getTime()) / 86400000;
    const granularity: "day" | "month" | "year" =
      spanDays <= 60 ? "day" : spanDays <= 730 ? "month" : "year";
    const bucketKey = (d: Date) => {
      if (granularity === "day") return format(d, "dd/MM");
      if (granularity === "month") return format(new Date(d.getFullYear(), d.getMonth(), 1), "MM/yy");
      return format(new Date(d.getFullYear(), 0, 1), "yyyy");
    };
    const stepDate = (d: Date) => {
      const r = new Date(d);
      if (granularity === "day") r.setDate(r.getDate() + 1);
      else if (granularity === "month") r.setMonth(r.getMonth() + 1);
      else r.setFullYear(r.getFullYear() + 1);
      return r;
    };
    const orderedBuckets = (): string[] => {
      const out: string[] = [];
      const seen = new Set<string>();
      let current = granularity === "day"
        ? new Date(dateRange.start)
        : granularity === "month"
        ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1)
        : new Date(dateRange.start.getFullYear(), 0, 1);
      while (current < dateRange.end) {
        const k = bucketKey(current);
        if (!seen.has(k)) { seen.add(k); out.push(k); }
        current = stepDate(current);
      }
      return out;
    };
    return { bucketKey, orderedBuckets };
  }, [dateRange]);

  const { revenueDailyData } = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      if (inRange(l.data_entrada_fechado_ganho) && l.valor) {
        const key = bucketHelpers.bucketKey(new Date(l.data_entrada_fechado_ganho!));
        map[key] = (map[key] || 0) + l.valor;
      }
    });
    const ordered = bucketHelpers.orderedBuckets();
    return { revenueDailyData: ordered.filter((d) => map[d]).map((d) => ({ date: d, receita: map[d] })) };
  }, [leads, dateRange, bucketHelpers]);

  // === Conversion time ===
  const conversionTimes = useMemo(() => {
    const leadToProposal: ConversionItem[] = [];
    const proposalToWon: ConversionItem[] = [];
    const leadToWon: ConversionItem[] = [];
    leads.forEach((l) => {
      // Use the earliest of created_at and data_entrada_novo_lead as the lead's
      // arrival in the pipeline. The trigger sometimes sets data_entrada_novo_lead
      // when status is moved BACK to "Novo Lead", which would otherwise mask the
      // real start date.
      const candidates = [l.created_at, l.data_entrada_novo_lead].filter(Boolean) as string[];
      const startTs = candidates.length
        ? candidates.reduce((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? a : b))
        : null;
      if (startTs && l.data_entrada_proposta_enviada && inRange(l.data_entrada_proposta_enviada)) {
        const diff = (new Date(l.data_entrada_proposta_enviada).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) leadToProposal.push({ lead: l, startTs, endTs: l.data_entrada_proposta_enviada, days: diff });
      }
      if (l.data_entrada_proposta_enviada && l.data_entrada_fechado_ganho && inRange(l.data_entrada_fechado_ganho)) {
        const diff = (new Date(l.data_entrada_fechado_ganho).getTime() - new Date(l.data_entrada_proposta_enviada).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) proposalToWon.push({ lead: l, startTs: l.data_entrada_proposta_enviada, endTs: l.data_entrada_fechado_ganho, days: diff });
      }
      if (startTs && l.data_entrada_fechado_ganho && inRange(l.data_entrada_fechado_ganho)) {
        const diff = (new Date(l.data_entrada_fechado_ganho).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) leadToWon.push({ lead: l, startTs, endTs: l.data_entrada_fechado_ganho, days: diff });
      }
    });
    const avg = (xs: ConversionItem[]) => (xs.length ? xs.reduce((s, x) => s + x.days, 0) / xs.length : null);
    return {
      leadToProposal: avg(leadToProposal),
      proposalToWon: avg(proposalToWon),
      leadToWon: avg(leadToWon),
      items: { leadToProposal, proposalToWon, leadToWon },
    };
  }, [leads, dateRange]);

  const handleConversionClick = (key: "leadToProposal" | "proposalToWon" | "leadToWon") => {
    const map = {
      leadToProposal: { title: "Lead → Proposta", startLabel: "Criado em", endLabel: "Proposta em", avg: conversionTimes.leadToProposal, items: conversionTimes.items.leadToProposal },
      proposalToWon: { title: "Proposta → Ganho", startLabel: "Proposta em", endLabel: "Ganho em", avg: conversionTimes.proposalToWon, items: conversionTimes.items.proposalToWon },
      leadToWon: { title: "Lead → Venda", startLabel: "Criado em", endLabel: "Ganho em", avg: conversionTimes.leadToWon, items: conversionTimes.items.leadToWon },
    }[key];
    const sorted = [...map.items].sort((a, b) => b.days - a.days);
    setConversionDrill({ title: map.title, startLabel: map.startLabel, endLabel: map.endLabel, items: sorted, averageDays: map.avg });
  };

  // === Losses ===
  const lossData = useMemo(() => {
    const lost = leadSets.perdidos;
    const byReason: Record<string, number> = {};
    lost.forEach((l) => {
      const m = l.motivo_perda || "Sem motivo";
      byReason[m] = (byReason[m] || 0) + 1;
    });
    const total = lost.length;
    const arr = Object.entries(byReason)
      .map(([motivo, count]) => ({ motivo, count, percent: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
    return { totalLost: total, byReason: arr };
  }, [leadSets.perdidos]);

  const handleLossReasonClick = (motivo: string) => {
    const filtered = leadSets.perdidos.filter((l) => (l.motivo_perda || "Sem motivo") === motivo);
    setDrillDown({
      title: `Perdidos — ${motivo}`,
      leads: filtered,
      dateField: "data_entrada_fechado_perdido",
      dateLabel: "Perdido em",
    });
  };

  // === Tasks ===
  const taskData = useMemo(() => {
    const periodTasks = tasks.filter((t) => inRange(t.created_at));
    const total = periodTasks.length;
    const completed = periodTasks.filter((t) => t.completed).length;
    const pending = periodTasks.filter((t) => !t.completed).length;
    const now = new Date();
    const overdue = periodTasks.filter((t) => {
      if (t.completed) return false;
      const [y, m, d] = t.due_date.substring(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d) < now;
    }).length;

    const cadenceCompleted = periodTasks.filter((t) => t.completed && t.is_cadence).length;
    const followUpCompleted = periodTasks.filter((t) => t.completed && !t.is_cadence).length;

    // Daily completed
    const map: Record<string, number> = {};
    periodTasks.forEach((t) => {
      if (t.completed && t.completed_at) {
        const k = bucketHelpers.bucketKey(new Date(t.completed_at));
        map[k] = (map[k] || 0) + 1;
      }
    });
    const dailyCompleted = bucketHelpers.orderedBuckets().filter((d) => map[d]).map((d) => ({ date: d, count: map[d] }));

    return { total, completed, pending, overdue, cadenceCompleted, followUpCompleted, dailyCompleted };
  }, [tasks, dateRange, bucketHelpers]);

  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const kpiCards = [
    { label: "Leads Criados", value: kpis.created, icon: Users, color: "text-primary" },
    { label: "Contato Iniciado", value: kpis.contato, icon: PhoneCall, color: "text-blue-400" },
    { label: "Propostas", value: kpis.propostas, icon: FileText, color: "text-yellow-500" },
    { label: "Contratos Enviados", value: kpis.contratos, icon: Send, color: "text-orange-400" },
    { label: "Ganhos", value: kpis.ganhos, icon: Trophy, color: "text-green-500" },
    { label: "Perdidos", value: kpis.perdidos, icon: XCircle, color: "text-destructive" },
  ];

  const revenueCards = [
    { label: "Receita Total", value: fmtCurrency(kpis.receita), icon: DollarSign, clickKey: "Ganhos" },
    { label: "Ticket Médio", value: fmtCurrency(kpis.ticket), icon: TrendingUp, clickKey: "Ganhos" },
    { label: "Taxa de Conversão", value: `${kpis.taxa.toFixed(1)}%`, icon: Percent, clickKey: null },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Relatórios
        </h1>
        <p className="text-muted-foreground mt-1">Análise de performance e conversão</p>
      </header>

      {/* Filters */}
      <ReportFilters
        period={period} onPeriodChange={setPeriod}
        customStart={customStart} customEnd={customEnd}
        onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd}
        origem={origem} onOrigemChange={setOrigem} origens={origens}
        interesse={interesse} onInteresseChange={setInteresse} interesses={interesses}
        isAdmin={isAdmin} clienteUserId={clienteUserId} onClienteChange={setClienteUserId}
        profiles={profiles}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className={`bg-card border border-border rounded-xl p-4 transition-colors ${c.value > 0 ? "cursor-pointer hover:border-primary/50" : ""}`}
            onClick={() => c.value > 0 && handleKpiClick(c.label)}
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {revenueCards.map((c) => (
          <div
            key={c.label}
            className={`bg-card border border-border rounded-xl p-4 transition-colors ${c.clickKey ? "cursor-pointer hover:border-primary/50" : ""}`}
            onClick={() => c.clickKey && handleKpiClick(c.clickKey)}
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="mb-6">
        <FunnelChart steps={funnelSteps} onStepClick={handleFunnelClick} />
      </div>

      {/* Meta Ads */}
      <div className="mb-6">
        <MetaAdsSection
          from={dateRange.start}
          to={dateRange.end}
          clienteUserId={clienteUserId}
          leadsCriados={kpis.created}
          ganhos={kpis.ganhos}
        />
      </div>

      {/* Revenue */}
      <div className="mb-6">
        <RevenueCompositionSection ganhos={leadSets.ganhos} />
      </div>

      <div className="mb-6">
        <RevenueSection total={kpis.receita} ticketMedio={kpis.ticket} dailyData={revenueDailyData} />
      </div>

      {/* Conversion time */}
      <div className="mb-6">
        <ConversionTimeSection
          leadToProposal={conversionTimes.leadToProposal}
          proposalToWon={conversionTimes.proposalToWon}
          leadToWon={conversionTimes.leadToWon}
          onMetricClick={handleConversionClick}
        />
      </div>

      {/* Losses */}
      <div className="mb-6">
        <LossSection totalLost={lossData.totalLost} byReason={lossData.byReason} onReasonClick={handleLossReasonClick} />
      </div>

      {/* Tasks */}
      <div className="mb-6">
        <TasksSection {...taskData} />
      </div>

      {/* Drill-down panel */}
      <ReportDrillDown
        open={!!drillDown}
        onOpenChange={(v) => { if (!v) setDrillDown(null); }}
        title={drillDown?.title || ""}
        leads={drillDown?.leads || []}
        dateField={drillDown?.dateField || "created_at"}
        dateLabel={drillDown?.dateLabel || "Data"}
      />

      <ConversionDrillDown
        open={!!conversionDrill}
        onOpenChange={(v) => { if (!v) setConversionDrill(null); }}
        title={conversionDrill?.title || ""}
        startLabel={conversionDrill?.startLabel || ""}
        endLabel={conversionDrill?.endLabel || ""}
        items={conversionDrill?.items || []}
        averageDays={conversionDrill?.averageDays ?? null}
      />
    </>
  );
};

export default RelatoriosPage;
