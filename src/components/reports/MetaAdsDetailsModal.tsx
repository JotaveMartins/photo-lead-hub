import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, ChevronDown, Search, ImageOff, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { parseLocalDate } from "@/lib/utils";
import type { MetaAdsRow } from "@/hooks/useMetaAdsReport";
import { useMetaAdCreatives } from "@/hooks/useMetaAdCreatives";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtDateBR = (iso: string) => {
  try { return parseLocalDate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }
  catch { return iso; }
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const spend = payload.find((p: any) => p.dataKey === "spend")?.value ?? 0;
  const conversas = payload.find((p: any) => p.dataKey === "conversas")?.value ?? 0;
  const cpl = conversas > 0 ? spend / conversas : null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{fmtDateBR(label)}</p>
      <p className="text-muted-foreground">Investimento: <span className="text-foreground">{fmtBRL(Number(spend))}</span></p>
      <p className="text-primary">Conversas: <span className="text-foreground">{fmtNum(Number(conversas))}</span></p>
      <p className="text-muted-foreground">Custo/conv.: <span className="text-foreground">{cpl == null ? "—" : fmtBRL(cpl)}</span></p>
    </div>
  );
}

interface Agg {
  spend: number; conversas: number; clicks: number; impressions: number; reach: number;
}
const emptyAgg = (): Agg => ({ spend: 0, conversas: 0, clicks: 0, impressions: 0, reach: 0 });
const addRow = (a: Agg, r: MetaAdsRow) => {
  a.spend += Number(r.spend || 0);
  a.conversas += r.messaging_conversations_started || 0;
  a.clicks += r.clicks || 0;
  a.impressions += r.impressions || 0;
  a.reach += r.reach || 0;
};

interface CampaignNode {
  id: string; name: string; agg: Agg;
  adsets: Map<string, AdsetNode>;
}
interface AdsetNode {
  id: string; name: string; agg: Agg;
  ads: Map<string, AdNode>;
}
interface AdNode {
  id: string; name: string; agg: Agg;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: MetaAdsRow[];
  leadsCriados: number;
  ganhos: number;
  ganhosTrafegoPago?: number;
}

type SortBy = "spend" | "conversas";

export default function MetaAdsDetailsModal({ open, onOpenChange, rows, leadsCriados, ganhos, ganhosTrafegoPago }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("spend");
  const [expandedCamp, setExpandedCamp] = useState<Set<string>>(new Set());
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null);

  const totals = useMemo(() => {
    const t = emptyAgg();
    for (const r of rows) addRow(t, r);
    return t;
  }, [rows]);

  const tree = useMemo(() => {
    const camps = new Map<string, CampaignNode>();
    for (const r of rows) {
      const cKey = r.campaign_id || r.campaign_name || "—";
      let c = camps.get(cKey);
      if (!c) { c = { id: cKey, name: r.campaign_name || "—", agg: emptyAgg(), adsets: new Map() }; camps.set(cKey, c); }
      addRow(c.agg, r);

      const sKey = r.adset_id || r.adset_name || "—";
      let s = c.adsets.get(sKey);
      if (!s) { s = { id: sKey, name: r.adset_name || "—", agg: emptyAgg(), ads: new Map() }; c.adsets.set(sKey, s); }
      addRow(s.agg, r);

      const aKey = r.ad_id || r.ad_name || "—";
      let a = s.ads.get(aKey);
      if (!a) { a = { id: aKey, name: r.ad_name || "—", agg: emptyAgg() }; s.ads.set(aKey, a); }
      addRow(a.agg, r);
    }
    return camps;
  }, [rows]);

  const adIds = useMemo(() => {
    const ids: string[] = [];
    for (const c of tree.values()) for (const s of c.adsets.values()) for (const a of s.ads.values()) if (a.id) ids.push(a.id);
    return ids;
  }, [tree]);
  const { data: creatives = {} } = useMetaAdCreatives(adIds);

  const sortAgg = <T extends { agg: Agg; name: string }>(list: T[]) =>
    list.sort((a, b) => (sortBy === "spend" ? b.agg.spend - a.agg.spend : b.agg.conversas - a.agg.conversas));

  const searchLower = search.trim().toLowerCase();
  const matches = (name: string) => !searchLower || name.toLowerCase().includes(searchLower);

  const campaignList = sortAgg(Array.from(tree.values())).filter((c) => {
    if (!searchLower) return true;
    if (matches(c.name)) return true;
    for (const s of c.adsets.values()) {
      if (matches(s.name)) return true;
      for (const a of s.ads.values()) if (matches(a.name)) return true;
    }
    return false;
  });

  const dailySeries = useMemo(() => {
    const m = new Map<string, { date: string; spend: number; conversas: number }>();
    for (const r of rows) {
      const d = r.date;
      let it = m.get(d);
      if (!it) { it = { date: d, spend: 0, conversas: 0 }; m.set(d, it); }
      it.spend += Number(r.spend || 0);
      it.conversas += r.messaging_conversations_started || 0;
    }
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const custoPorConversa = totals.conversas > 0 ? totals.spend / totals.conversas : null;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null;
  const aproveitamento = totals.conversas > 0 ? (leadsCriados / totals.conversas) * 100 : null;
  const custoPorLead = leadsCriados > 0 ? totals.spend / leadsCriados : null;
  const vendasParaCAC = ganhosTrafegoPago ?? ganhos;
  const custoPorVenda = vendasParaCAC > 0 ? totals.spend / vendasParaCAC : null;

  const kpis: { label: string; value: string }[] = [
    { label: "Investimento", value: fmtBRL(totals.spend) },
    { label: "Conversas", value: fmtNum(totals.conversas) },
    { label: "Custo/conversa", value: custoPorConversa == null ? "—" : fmtBRL(custoPorConversa) },
    { label: "Cliques", value: fmtNum(totals.clicks) },
    { label: "CTR", value: fmtPct(ctr) },
    { label: "CPM", value: cpm == null ? "—" : fmtBRL(cpm) },
    { label: "Impressões", value: fmtNum(totals.impressions) },
    { label: "Alcance", value: fmtNum(totals.reach) },
    { label: "Leads CRM", value: fmtNum(leadsCriados) },
    { label: "Custo/lead", value: custoPorLead == null ? "—" : fmtBRL(custoPorLead) },
    { label: "Custo/venda", value: custoPorVenda == null ? "—" : fmtBRL(custoPorVenda) },
    { label: "Aproveitamento", value: fmtPct(aproveitamento) },
  ];

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    setter(n);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-xl font-display text-foreground">Meta Ads — Detalhamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {dailySeries.length > 1 && (
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">Investimento e conversas por dia</p>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={dailySeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={fmtDateBR} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--primary))" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line yAxisId="left" type="monotone" dataKey="spend" name="Investimento" stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="conversas" name="Conversas" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar campanha, conjunto ou anúncio..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-background border border-border rounded px-2 py-1.5 text-foreground"
              >
                <option value="spend">Investimento</option>
                <option value="conversas">Conversas</option>
              </select>
            </div>
          </div>

          {/* Tree table */}
          <div className="border border-border rounded-lg">
            <div className="grid grid-cols-[minmax(240px,1fr)_120px_110px_130px_100px_90px] text-xs uppercase text-muted-foreground bg-muted/30 border-b border-border px-4 py-2.5 gap-2">
              <div>Nome</div>
              <div className="text-right">Invest.</div>
              <div className="text-right">Conversas</div>
              <div className="text-right">Custo/conv.</div>
              <div className="text-right">Cliques</div>
              <div className="text-right">CTR</div>
            </div>

            {campaignList.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado.</p>
            )}

            {campaignList.map((c) => {
              const cCpc = c.agg.conversas > 0 ? c.agg.spend / c.agg.conversas : null;
              const cCtr = c.agg.impressions > 0 ? (c.agg.clicks / c.agg.impressions) * 100 : null;
              const isOpen = expandedCamp.has(c.id);
              return (
                <div key={c.id} className="border-b border-border/60 last:border-0">
                  <button
                    onClick={() => toggle(expandedCamp, setExpandedCamp, c.id)}
                    className="w-full grid grid-cols-[minmax(240px,1fr)_120px_110px_130px_100px_90px] gap-2 items-center px-4 py-2.5 hover:bg-muted/20 text-sm text-left"
                  >
                    <div className="flex items-center gap-1.5 text-foreground font-medium truncate">
                      {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <span className="truncate" title={c.name}>{c.name}</span>
                    </div>
                    <div className="text-right text-foreground">{fmtBRL(c.agg.spend)}</div>
                    <div className="text-right text-foreground">{fmtNum(c.agg.conversas)}</div>
                    <div className="text-right text-foreground">{cCpc == null ? "—" : fmtBRL(cCpc)}</div>
                    <div className="text-right text-foreground">{fmtNum(c.agg.clicks)}</div>
                    <div className="text-right text-foreground">{fmtPct(cCtr)}</div>
                  </button>

                  {isOpen && sortAgg(Array.from(c.adsets.values())).map((s) => {
                    const sCpc = s.agg.conversas > 0 ? s.agg.spend / s.agg.conversas : null;
                    const sCtr = s.agg.impressions > 0 ? (s.agg.clicks / s.agg.impressions) * 100 : null;
                    const sOpen = expandedSet.has(`${c.id}::${s.id}`);
                    return (
                      <div key={s.id} className="bg-muted/10">
                        <button
                          onClick={() => toggle(expandedSet, setExpandedSet, `${c.id}::${s.id}`)}
                          className="w-full grid grid-cols-[minmax(240px,1fr)_120px_110px_130px_100px_90px] gap-2 items-center px-4 py-2 pl-10 hover:bg-muted/30 text-sm text-left"
                        >
                          <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                            {sOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                            <span className="truncate" title={s.name}>{s.name}</span>
                          </div>
                          <div className="text-right text-foreground/90">{fmtBRL(s.agg.spend)}</div>
                          <div className="text-right text-foreground/90">{fmtNum(s.agg.conversas)}</div>
                          <div className="text-right text-foreground/90">{sCpc == null ? "—" : fmtBRL(sCpc)}</div>
                          <div className="text-right text-foreground/90">{fmtNum(s.agg.clicks)}</div>
                          <div className="text-right text-foreground/90">{fmtPct(sCtr)}</div>
                        </button>

                        {sOpen && sortAgg(Array.from(s.ads.values())).map((a) => {
                          const aCpc = a.agg.conversas > 0 ? a.agg.spend / a.agg.conversas : null;
                          const aCtr = a.agg.impressions > 0 ? (a.agg.clicks / a.agg.impressions) * 100 : null;
                          const cr = creatives[a.id];
                          const thumb = cr?.thumbnail_url || cr?.image_url || null;
                          return (
                            <div key={a.id} className="grid grid-cols-[minmax(240px,1fr)_120px_110px_130px_100px_90px] gap-2 items-center px-4 py-2 pl-16 text-sm border-t border-border/30">
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className="shrink-0"
                                  onMouseEnter={(e) => {
                                    if (!thumb) return;
                                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setHoverPreview({ src: thumb, x: r.right, y: r.top });
                                  }}
                                  onMouseLeave={() => setHoverPreview(null)}
                                >
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt={a.name}
                                      className="w-12 h-12 rounded object-cover bg-muted"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                      <ImageOff className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <span className="truncate text-foreground/80" title={a.name}>{a.name}</span>
                                {thumb && (
                                  <a href={thumb} target="_blank" rel="noopener noreferrer" title="Abrir imagem do criativo" className="text-muted-foreground hover:text-foreground shrink-0">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="text-right text-foreground/80">{fmtBRL(a.agg.spend)}</div>
                              <div className="text-right text-foreground/80">{fmtNum(a.agg.conversas)}</div>
                              <div className="text-right text-foreground/80">{aCpc == null ? "—" : fmtBRL(aCpc)}</div>
                              <div className="text-right text-foreground/80">{fmtNum(a.agg.clicks)}</div>
                              <div className="text-right text-foreground/80">{fmtPct(aCtr)}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {hoverPreview && typeof document !== "undefined" && createPortal(
          (() => {
            const size = 320;
            const left = Math.min(hoverPreview.x + 12, window.innerWidth - size - 12);
            const top = Math.max(12, Math.min(hoverPreview.y - size / 2 + 24, window.innerHeight - size - 12));
            return (
              <div
                className="fixed pointer-events-none z-[9999] w-80 h-80 rounded-lg overflow-hidden border border-border shadow-2xl bg-card"
                style={{ left, top }}
              >
                <img src={hoverPreview.src} alt="preview" className="w-full h-full object-cover" />
              </div>
            );
          })(),
          document.body
        )}
      </DialogContent>
    </Dialog>
  );
}