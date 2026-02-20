import { useState, useMemo } from "react";
import { BarChart3, Users, PhoneCall, FileText, Send, Trophy, XCircle, DollarSign, TrendingUp, Percent } from "lucide-react";
import { useReportData } from "@/hooks/useReportData";
import ReportFilters, { PeriodOption, getDateRange } from "@/components/reports/ReportFilters";
import FunnelChart from "@/components/reports/FunnelChart";

import RevenueSection from "@/components/reports/RevenueSection";
import ConversionTimeSection from "@/components/reports/ConversionTimeSection";
import LossSection from "@/components/reports/LossSection";
import TasksSection from "@/components/reports/TasksSection";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

const RelatoriosPage = () => {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [origem, setOrigem] = useState("");
  const [clienteUserId, setClienteUserId] = useState("");

  const { leads, tasks, profiles, isLoading, isAdmin } = useReportData({ origem, clienteUserId });

  const dateRange = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  // Unique origens
  const origens = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.origem) set.add(l.origem); });
    return Array.from(set).sort();
  }, [leads]);

  // Helper: check if a timestamp falls within the selected period
  const inRange = (ts: string | null) => {
    if (!ts) return false;
    const d = new Date(ts);
    return d >= dateRange.start && d < dateRange.end;
  };

  // === KPIs ===
  const kpis = useMemo(() => {
    const created = leads.filter((l) => inRange(l.created_at)).length;
    const contato = leads.filter((l) => inRange(l.data_entrada_contato_iniciado)).length;
    const propostas = leads.filter((l) => inRange(l.data_entrada_proposta_enviada)).length;
    const contratos = leads.filter((l) => inRange(l.data_entrada_contrato_enviado)).length;
    const ganhos = leads.filter((l) => inRange(l.data_entrada_fechado_ganho)).length;
    const perdidos = leads.filter((l) => inRange(l.data_entrada_fechado_perdido)).length;

    const receitaLeads = leads.filter((l) => inRange(l.data_entrada_fechado_ganho) && l.valor);
    const receita = receitaLeads.reduce((s, l) => s + (l.valor || 0), 0);
    const ticket = ganhos > 0 ? receita / ganhos : 0;
    const taxa = created > 0 ? (ganhos / created) * 100 : 0;

    return { created, contato, propostas, contratos, ganhos, perdidos, receita, ticket, taxa };
  }, [leads, dateRange]);

  // === Funnel ===
  const funnelSteps = useMemo(() => [
    { label: "Leads", value: kpis.created },
    { label: "Contato Iniciado", value: kpis.contato },
    { label: "Proposta", value: kpis.propostas },
    { label: "Contrato Enviado", value: kpis.contratos },
    { label: "Ganho", value: kpis.ganhos },
  ], [kpis]);


  // === Revenue daily ===
  const { revenueDailyData } = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      if (inRange(l.data_entrada_fechado_ganho) && l.valor) {
        const d = format(new Date(l.data_entrada_fechado_ganho!), "dd/MM");
        map[d] = (map[d] || 0) + l.valor;
      }
    });
    const days: string[] = [];
    const current = new Date(dateRange.start);
    while (current < dateRange.end) {
      days.push(format(current, "dd/MM"));
      current.setDate(current.getDate() + 1);
    }
    return { revenueDailyData: days.filter((d) => map[d]).map((d) => ({ date: d, receita: map[d] })) };
  }, [leads, dateRange]);

  // === Conversion time ===
  const conversionTimes = useMemo(() => {
    const leadToProposal: number[] = [];
    const proposalToWon: number[] = [];
    leads.forEach((l) => {
      if (l.data_entrada_novo_lead && l.data_entrada_proposta_enviada && inRange(l.data_entrada_proposta_enviada)) {
        const diff = (new Date(l.data_entrada_proposta_enviada).getTime() - new Date(l.data_entrada_novo_lead).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) leadToProposal.push(diff);
      }
      if (l.data_entrada_proposta_enviada && l.data_entrada_fechado_ganho && inRange(l.data_entrada_fechado_ganho)) {
        const diff = (new Date(l.data_entrada_fechado_ganho).getTime() - new Date(l.data_entrada_proposta_enviada).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) proposalToWon.push(diff);
      }
    });
    return {
      leadToProposal: leadToProposal.length > 0 ? leadToProposal.reduce((a, b) => a + b, 0) / leadToProposal.length : null,
      proposalToWon: proposalToWon.length > 0 ? proposalToWon.reduce((a, b) => a + b, 0) / proposalToWon.length : null,
    };
  }, [leads, dateRange]);

  // === Losses ===
  const lossData = useMemo(() => {
    const lost = leads.filter((l) => inRange(l.data_entrada_fechado_perdido));
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
  }, [leads, dateRange]);

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
        const d = format(new Date(t.completed_at), "dd/MM");
        map[d] = (map[d] || 0) + 1;
      }
    });
    const days: string[] = [];
    const current = new Date(dateRange.start);
    while (current < dateRange.end) {
      days.push(format(current, "dd/MM"));
      current.setDate(current.getDate() + 1);
    }
    const dailyCompleted = days.filter((d) => map[d]).map((d) => ({ date: d, count: map[d] }));

    return { total, completed, pending, overdue, cadenceCompleted, followUpCompleted, dailyCompleted };
  }, [tasks, dateRange]);

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
    { label: "Receita Total", value: fmtCurrency(kpis.receita), icon: DollarSign },
    { label: "Ticket Médio", value: fmtCurrency(kpis.ticket), icon: TrendingUp },
    { label: "Taxa de Conversão", value: `${kpis.taxa.toFixed(1)}%`, icon: Percent },
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
        isAdmin={isAdmin} clienteUserId={clienteUserId} onClienteChange={setClienteUserId}
        profiles={profiles}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {kpiCards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
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
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
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
        <FunnelChart steps={funnelSteps} />
      </div>

      {/* Revenue */}
      <div className="mb-6">
        <RevenueSection total={kpis.receita} ticketMedio={kpis.ticket} dailyData={revenueDailyData} />
      </div>

      {/* Conversion time */}
      <div className="mb-6">
        <ConversionTimeSection leadToProposal={conversionTimes.leadToProposal} proposalToWon={conversionTimes.proposalToWon} />
      </div>

      {/* Losses */}
      <div className="mb-6">
        <LossSection totalLost={lossData.totalLost} byReason={lossData.byReason} />
      </div>

      {/* Tasks */}
      <div className="mb-6">
        <TasksSection {...taskData} />
      </div>
    </>
  );
};

export default RelatoriosPage;
