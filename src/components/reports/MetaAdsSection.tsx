import { useMemo, useState } from "react";
import { Megaphone, DollarSign, MessageSquare, MousePointerClick, Percent, Users, HelpCircle, TrendingUp, Target, Maximize2 } from "lucide-react";
import { useMetaAdsReport } from "@/hooks/useMetaAdsReport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import MetaAdsDetailsModal from "./MetaAdsDetailsModal";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

interface MetaAdsSectionProps {
  from: Date;
  to: Date; // exclusive
  clienteUserId?: string;
  leadsCriados: number;
  ganhos: number;
  ganhosTrafegoPago?: number;
  faturamento: number;
  faturamentoTrafegoPago?: number;
}

function Hint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function MetaAdsSection({ from, to, clienteUserId, leadsCriados, ganhos, ganhosTrafegoPago }: MetaAdsSectionProps) {
  // to is exclusive end — convert to inclusive for date column
  const fromStr = format(from, "yyyy-MM-dd");
  const toIncl = new Date(to.getTime() - 86400000);
  const toStr = format(toIncl, "yyyy-MM-dd");

  const { data: rows = [], isLoading } = useMetaAdsReport(fromStr, toStr, clienteUserId);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const totals = useMemo(() => {
    const t = { spend: 0, conversas: 0, clicks: 0, impressions: 0 };
    for (const r of rows) {
      t.spend += Number(r.spend || 0);
      t.conversas += r.messaging_conversations_started || 0;
      t.clicks += r.clicks || 0;
      t.impressions += r.impressions || 0;
    }
    return t;
  }, [rows]);

  const custoPorConversa = totals.conversas > 0 ? totals.spend / totals.conversas : null;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
  const aproveitamento = totals.conversas > 0 ? (leadsCriados / totals.conversas) * 100 : null;
  const custoPorLead = leadsCriados > 0 ? totals.spend / leadsCriados : null;
  const vendasParaCAC = ganhosTrafegoPago ?? ganhos;
  const custoPorVenda = vendasParaCAC > 0 ? totals.spend / vendasParaCAC : null;

  const aproveitColor =
    aproveitamento == null
      ? "border-border text-muted-foreground"
      : aproveitamento >= 80
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
      : aproveitamento >= 60
      ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
      : "border-red-500/40 bg-red-500/10 text-red-500";

  // Campaign aggregation
  const campanhas = useMemo(() => {
    const map = new Map<string, { name: string; spend: number; conversas: number; clicks: number; impressions: number }>();
    for (const r of rows) {
      const key = r.campaign_name || "—";
      let c = map.get(key);
      if (!c) { c = { name: key, spend: 0, conversas: 0, clicks: 0, impressions: 0 }; map.set(key, c); }
      c.spend += Number(r.spend || 0);
      c.conversas += r.messaging_conversations_started || 0;
      c.clicks += r.clicks || 0;
      c.impressions += r.impressions || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const cards = [
    { label: "Investimento", value: fmtBRL(totals.spend), icon: DollarSign, hint: "Quanto foi investido em anúncios no Meta no período." },
    { label: "Conversas geradas", value: fmtNum(totals.conversas), icon: MessageSquare, hint: "Número de novas conversas iniciadas pelos anúncios." },
    { label: "Custo por conversa", value: custoPorConversa == null ? "—" : fmtBRL(custoPorConversa), icon: Target, hint: "Valor médio investido para gerar uma nova conversa." },
    { label: "Cliques", value: fmtNum(totals.clicks), icon: MousePointerClick, hint: "Total de cliques nos anúncios no período." },
    { label: "Taxa de cliques", value: fmtPct(ctr), icon: Percent, hint: "Percentual de pessoas que viram o anúncio e clicaram." },
    { label: "Leads no CRM", value: fmtNum(leadsCriados), icon: Users, hint: "Leads cadastrados no CRM no mesmo período." },
  ];

  const integrCards = [
    { label: "Custo por lead", value: custoPorLead == null ? "—" : fmtBRL(custoPorLead), hint: "Investimento dividido pelo número de leads cadastrados no CRM." },
    { label: "Custo por venda", value: custoPorVenda == null ? "—" : fmtBRL(custoPorVenda), hint: "Investimento dividido pelo número de vendas fechadas com origem em Tráfego Pago." },
    { label: "Aproveitamento do CRM", value: fmtPct(aproveitamento), hint: "Percentual das conversas geradas pelos anúncios que viraram leads no CRM." },
  ];

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Meta Ads</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Investimento → Conversas → Leads → Vendas</span>
          {rows.length > 0 && (
            <button
              onClick={() => setDetailsOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1.5 transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Ver detalhes
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando dados de Meta Ads...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhum dado de Meta Ads para o período selecionado.
        </p>
      ) : (
        <>
          {/* Main KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <c.icon className="w-4 h-4 text-primary" />
                  <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
                  <Hint text={c.hint} />
                </div>
                <p className="text-lg font-bold text-foreground">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Visual flow card */}
          <div className={`rounded-lg border p-4 mb-4 ${aproveitColor}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 justify-between">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Conversas Meta → Leads CRM</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span><strong className="text-foreground">{fmtNum(totals.conversas)}</strong> <span className="text-muted-foreground">conversas geradas</span></span>
                <span><strong className="text-foreground">{fmtNum(leadsCriados)}</strong> <span className="text-muted-foreground">leads cadastrados</span></span>
                <span className="font-semibold">{fmtPct(aproveitamento)} aproveitado</span>
              </div>
            </div>
          </div>

          {/* Integrated metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {integrCards.map((c) => (
              <div key={c.label} className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <Hint text={c.hint} />
                </div>
                <p className="text-xl font-bold text-foreground">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Campaigns table */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Campanhas</h3>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 px-3">Campanha</th>
                    <th className="py-2 px-3 text-right">Investimento</th>
                    <th className="py-2 px-3 text-right">Conversas</th>
                    <th className="py-2 px-3 text-right">Custo/conversa</th>
                    <th className="py-2 px-3 text-right">Taxa de cliques</th>
                  </tr>
                </thead>
                <tbody>
                  {campanhas.map((c) => {
                    const cpc = c.conversas > 0 ? c.spend / c.conversas : null;
                    const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : null;
                    return (
                      <tr key={c.name} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-3 text-foreground max-w-[360px] truncate" title={c.name}>{c.name}</td>
                        <td className="py-2 px-3 text-right text-foreground">{fmtBRL(c.spend)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{fmtNum(c.conversas)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{cpc == null ? "—" : fmtBRL(cpc)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{fmtPct(cCtr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <MetaAdsDetailsModal
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            rows={rows}
            leadsCriados={leadsCriados}
            ganhos={ganhos}
            ganhosTrafegoPago={ganhosTrafegoPago}
          />
        </>
      )}
    </section>
  );
}