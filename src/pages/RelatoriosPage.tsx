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
import { buildLeadPipelineFacts, buildHistoryByLead, getFirstStageEntry } from "@/lib/leadPipelineReporting";
import { format } from "date-fns";
import { usePlanoBasico } from "@/hooks/usePlanoBasico";

type DrillDown = {
  title: string;
  leads: ReportLead[];
  dateField: keyof ReportLead;
  dateLabel: string;
  /** Datas derivadas do histórico de etapas (lead_id -> timestamp), sem gravar em leads */
  dates?: Record<string, string | null>;
} | null;

const RelatoriosPage = () => {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [origem, setOrigem] = useState<string[]>([]);
  const [interesse, setInteresse] = useState<string[]>([]);
  const [clienteUserId, setClienteUserId] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDown>(null);
  const [conversionDrill, setConversionDrill] = useState<{
    title: string;
    startLabel: string;
    endLabel: string;
    items: ConversionItem[];
    averageDays: number | null;
  } | null>(null);

  const { leads: allLeads, tasks, profiles, stages, stageHistory, isLoading, isAdmin } = useReportData({ clienteUserId });
  const planoBasico = usePlanoBasico();

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
      if (origem.length && (!l.origem || !origem.includes(l.origem))) return false;
      if (interesse.length && (!l.interesse || !interesse.includes(l.interesse))) return false;
      return true;
    });
  }, [allLeads, origem, interesse]);

  // Helper: check if a timestamp falls within the selected period
  const inRange = (ts: string | null) => {
    if (!ts) return false;
    const d = new Date(ts);
    return d >= dateRange.start && d < dateRange.end;
  };

  // === Fatos derivados do histórico de etapas (Sprint 02) ===
  // Fonte semântica: pipeline_stages (stage_role/legacy_status) + lead_stage_history.
  // Regras universais não dependem do nome visível da etapa; reentradas não duplicam.
  const facts = useMemo(
    () => buildLeadPipelineFacts(leads, stages, stageHistory),
    [leads, stages, stageHistory],
  );
  // === Filtered lead sets (reusable for drill-down) ===
  const leadSets = useMemo(() => ({
    created: leads.filter((l) => inRange((l as any).data_contato ?? l.created_at)),
    contato: leads.filter((l) => inRange(facts.get(l.id)?.contatoTs ?? null)),
    propostas: leads.filter((l) => inRange(facts.get(l.id)?.propostaTs ?? null)),
    contratos: leads.filter((l) => inRange(facts.get(l.id)?.contratoTs ?? null)),
    ganhos: leads.filter((l) => inRange(facts.get(l.id)?.wonTs ?? null)),
    perdidos: leads.filter((l) => inRange(facts.get(l.id)?.lostTs ?? null)),
  }), [leads, dateRange, facts]);

  // Datas derivadas por conjunto (para o drill-down, sem gravar em leads)
  const derivedDates = useMemo(() => {
    const build = (key: "contatoTs" | "propostaTs" | "contratoTs" | "wonTs" | "lostTs", set: ReportLead[]) => {
      const out: Record<string, string | null> = {};
      set.forEach((l) => { out[l.id] = facts.get(l.id)?.[key] ?? null; });
      return out;
    };
    return {
      created: Object.fromEntries(leadSets.created.map((l) => [l.id, (l as any).data_contato ?? l.created_at])) as Record<string, string | null>,
      contato: build("contatoTs", leadSets.contato),
      propostas: build("propostaTs", leadSets.propostas),
      contratos: build("contratoTs", leadSets.contratos),
      ganhos: build("wonTs", leadSets.ganhos),
      perdidos: build("lostTs", leadSets.perdidos),
    };
  }, [leadSets, facts]);

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
  const isConsolidated = isAdmin && clienteUserId === "__all__";

  // Primeira entrada por etapa (para o funil individual dinâmico e drill-downs)
  const stageEntrySets = useMemo(() => {
    const historyByLead = buildHistoryByLead(stageHistory);
    const out = new Map<string, { leads: ReportLead[]; dates: Record<string, string | null> }>();
    for (const s of stages) {
      const ls: ReportLead[] = [];
      const dates: Record<string, string | null> = {};
      for (const l of leads) {
        const ts = getFirstStageEntry(historyByLead.get(l.id), s.id);
        if (inRange(ts)) { ls.push(l); dates[l.id] = ts; }
      }
      out.set(s.id, { leads: ls, dates });
    }
    return out;
  }, [stages, leads, stageHistory, dateRange]);

  // Consolidado: leads únicos com entrada em qualquer etapa open/proposal no período
  const negociacaoSet = useMemo(() => {
    const ids = new Set<string>();
    stageHistory.forEach((e) => {
      if ((e.to_stage_role === "open" || e.to_stage_role === "proposal") && inRange(e.entered_at)) ids.add(e.lead_id);
    });
    return leads.filter((l) => ids.has(l.id));
  }, [leads, stageHistory, dateRange]);

  const funnelSteps = useMemo(() => {
    if (isConsolidated) {
      // Funil consolidado universal: etapas personalizadas de contas diferentes
      // nunca se misturam. Perdidos fica fora do funil linear.
      return [
        { label: "Leads Captados", value: kpis.created },
        { label: "Em Negociação", value: negociacaoSet.length },
        { label: "Vendas Ganhas", value: kpis.ganhos },
      ];
    }
    // Individual: funil usa as pipeline_stages atuais da conta (lead/open/proposal/won),
    // em ordem, com o nome atual de cada etapa. Lost fica fora do funil linear.
    return stages
      .filter((s) => s.stage_role !== "lost")
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        label: s.name,
        value: s.stage_role === "lead" ? kpis.created : (stageEntrySets.get(s.id)?.leads.length ?? 0),
      }));
  }, [isConsolidated, kpis, stages, stageEntrySets, negociacaoSet]);

  const handleFunnelClick = (label: string) => {
    if (isConsolidated) {
      const map: Record<string, { leads: ReportLead[]; dateField: keyof ReportLead; dateLabel: string; dates: Record<string, string | null> }> = {
        "Leads Captados": { leads: leadSets.created, dateField: "data_contato" as keyof ReportLead, dateLabel: "Data do Contato", dates: derivedDates.created },
        "Em Negociação": { leads: negociacaoSet, dateField: "created_at", dateLabel: "Criado em", dates: derivedDates.created },
        "Vendas Ganhas": { leads: leadSets.ganhos, dateField: "data_entrada_fechado_ganho", dateLabel: "Ganho em", dates: derivedDates.ganhos },
      };
      const item = map[label];
      if (item) setDrillDown({ title: label, ...item });
      return;
    }
    const stage = stages.find((s) => s.name === label && s.stage_role !== "lost");
    if (!stage) return;
    if (stage.stage_role === "lead") {
      setDrillDown({ title: label, leads: leadSets.created, dateField: "data_contato" as keyof ReportLead, dateLabel: "Data do Contato", dates: derivedDates.created });
      return;
    }
    const set = stageEntrySets.get(stage.id);
    if (set) setDrillDown({ title: label, leads: set.leads, dateField: "created_at", dateLabel: "Entrada em", dates: set.dates });
  };

  const handleKpiClick = (key: string) => {
    const map: Record<string, { title: string; leads: ReportLead[]; dateField: keyof ReportLead; dateLabel: string; dates: Record<string, string | null> }> = {
      created: { title: "Leads Criados", leads: leadSets.created, dateField: "data_contato" as keyof ReportLead, dateLabel: "Data do Contato", dates: derivedDates.created },
      contato: { title: "Contato Iniciado", leads: leadSets.contato, dateField: "data_entrada_contato_iniciado", dateLabel: "Contato em", dates: derivedDates.contato },
      propostas: { title: "Propostas Enviadas", leads: leadSets.propostas, dateField: "data_entrada_proposta_enviada", dateLabel: "Proposta em", dates: derivedDates.propostas },
      contratos: { title: "Contratos Enviados", leads: leadSets.contratos, dateField: "data_entrada_contrato_enviado", dateLabel: "Contrato em", dates: derivedDates.contratos },
      ganhos: { title: "Negócios Ganhos", leads: leadSets.ganhos, dateField: "data_entrada_fechado_ganho", dateLabel: "Ganho em", dates: derivedDates.ganhos },
      perdidos: { title: "Negócios Perdidos", leads: leadSets.perdidos, dateField: "data_entrada_fechado_perdido", dateLabel: "Perdido em", dates: derivedDates.perdidos },
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
      const wonTs = facts.get(l.id)?.wonTs ?? null;
      if (inRange(wonTs) && l.valor) {
        const key = bucketHelpers.bucketKey(new Date(wonTs!));
        map[key] = (map[key] || 0) + l.valor;
      }
    });
    const ordered = bucketHelpers.orderedBuckets();
    return { revenueDailyData: ordered.filter((d) => map[d]).map((d) => ({ date: d, receita: map[d] })) };
  }, [leads, dateRange, bucketHelpers, facts]);

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
      const candidates = [(l as any).data_contato, l.data_entrada_novo_lead, l.created_at].filter(Boolean) as string[];
      const startTs = candidates.length
        ? candidates.reduce((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? a : b))
        : null;
      const propostaTs = facts.get(l.id)?.propostaTs ?? null;
      const wonTs = facts.get(l.id)?.wonTs ?? null;
      if (startTs && propostaTs && inRange(propostaTs)) {
        const diff = (new Date(propostaTs).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) leadToProposal.push({ lead: l, startTs, endTs: propostaTs, days: diff });
      }
      if (propostaTs && wonTs && inRange(wonTs)) {
        const diff = (new Date(wonTs).getTime() - new Date(propostaTs).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) proposalToWon.push({ lead: l, startTs: propostaTs, endTs: wonTs, days: diff });
      }
      if (startTs && wonTs && inRange(wonTs)) {
        const diff = (new Date(wonTs).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) leadToWon.push({ lead: l, startTs, endTs: wonTs, days: diff });
      }
    });
    const avg = (xs: ConversionItem[]) => (xs.length ? xs.reduce((s, x) => s + x.days, 0) / xs.length : null);
    return {
      leadToProposal: avg(leadToProposal),
      proposalToWon: avg(proposalToWon),
      leadToWon: avg(leadToWon),
      items: { leadToProposal, proposalToWon, leadToWon },
    };
  }, [leads, dateRange, facts]);

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
      dates: derivedDates.perdidos,
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

  // KPI cards: fixos Leads Criados / Ganhos / Perdidos. Na visão individual,
  // Contato/Proposta/Contrato aparecem somente se a etapa correspondente existe
  // na conta, usando o nome atual da etapa.
  const contatoStage = !isConsolidated ? stages.find((s) => s.legacy_status === "Contato Iniciado") : null;
  const contratoStage = !isConsolidated ? stages.find((s) => s.legacy_status === "Contrato Enviado") : null;
  const proposalStageRow = !isConsolidated ? stages.find((s) => s.stage_role === "proposal") : null;

  const kpiCards = [
    { key: "created", label: "Leads Criados", value: kpis.created, icon: Users, color: "text-primary" },
    ...(isConsolidated || contatoStage
      ? [{ key: "contato", label: contatoStage?.name ?? "Contato Iniciado", value: kpis.contato, icon: PhoneCall, color: "text-blue-400" }]
      : []),
    ...(isConsolidated || proposalStageRow
      ? [{ key: "propostas", label: proposalStageRow?.name ?? "Propostas", value: kpis.propostas, icon: FileText, color: "text-yellow-500" }]
      : []),
    ...(isConsolidated || contratoStage
      ? [{ key: "contratos", label: contratoStage?.name ?? "Contratos Enviados", value: kpis.contratos, icon: Send, color: "text-orange-400" }]
      : []),
    { key: "ganhos", label: "Ganhos", value: kpis.ganhos, icon: Trophy, color: "text-green-500" },
    { key: "perdidos", label: "Perdidos", value: kpis.perdidos, icon: XCircle, color: "text-destructive" },
  ];

  const revenueCards = [
    { label: "Receita Total", value: fmtCurrency(kpis.receita), icon: DollarSign, clickKey: "ganhos" },
    { label: "Ticket Médio", value: fmtCurrency(kpis.ticket), icon: TrendingUp, clickKey: "ganhos" },
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
            key={c.key}
            className={`bg-card border border-border rounded-xl p-4 transition-colors ${c.value > 0 ? "cursor-pointer hover:border-primary/50" : ""}`}
            onClick={() => c.value > 0 && handleKpiClick(c.key)}
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
      {!planoBasico && (
        <div className="mb-6">
          <MetaAdsSection
            from={dateRange.start}
            to={dateRange.end}
            clienteUserId={clienteUserId}
            leadsCriados={leadSets.created.filter((l: any) => {
              const o = (l.origem || "").toLowerCase();
              return o === "tráfego pago" || o === "trafego pago";
            }).length}
            ganhos={kpis.ganhos}
            ganhosTrafegoPago={leadSets.ganhos.filter((l: any) => {
              const o = (l.origem || "").toLowerCase();
              return o === "tráfego pago" || o === "trafego pago";
            }).length}
            faturamento={kpis.receita}
            faturamentoTrafegoPago={leadSets.ganhos
              .filter((l: any) => {
                const o = (l.origem || "").toLowerCase();
                return o === "tráfego pago" || o === "trafego pago";
              })
              .reduce((s: number, l: any) => s + (l.valor || 0), 0)}
            wonLeads={leadSets.ganhos.map((l: any) => ({ user_id: l.user_id, valor: l.valor, origem: l.origem }))}
            profiles={profiles}
            isConsolidated={isAdmin && clienteUserId === "__all__"}
          />
        </div>
      )}

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
        dates={drillDown?.dates}
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
