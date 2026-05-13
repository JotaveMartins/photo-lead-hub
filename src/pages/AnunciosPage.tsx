import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BadgeDollarSign, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/DateRangePicker";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}%`);

export default function AnunciosPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [profileId, setProfileId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, meta_ad_account_id, cpl_limite_bom, cpl_limite_alerta")
        .not("meta_ad_account_id", "is", null)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const selectedProfile = profiles.find((p: any) => p.user_id === profileId);
  const adAccountForFilter = (selectedProfile as any)?.meta_ad_account_id ?? null;

  const { data: rows = [], isLoading } = useCampaignMetrics(from, to, adAccountForFilter);

  const totals = useMemo(() => {
    const t = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      results: 0,
      result_label: "Resultados",
    };
    let resultTypeCount: Record<string, number> = {};
    for (const r of rows) {
      t.spend += Number(r.spend || 0);
      t.impressions += r.impressions || 0;
      t.clicks += r.clicks || 0;
      t.results += r.results || 0;
      if (r.result_type) resultTypeCount[r.result_type] = (resultTypeCount[r.result_type] || 0) + (r.results || 0);
    }
    const dom = Object.entries(resultTypeCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (dom === "messages") t.result_label = "Mensagens";
    else if (dom === "leads") t.result_label = "Leads";
    else if (dom === "purchases") t.result_label = "Compras";
    else if (dom === "traffic") t.result_label = "Cliques no link";
    return t;
  }, [rows]);

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null;
  const cpr = totals.results > 0 ? totals.spend / totals.results : null;

  const cplBom = (selectedProfile as any)?.cpl_limite_bom ?? null;
  const cplAlerta = (selectedProfile as any)?.cpl_limite_alerta ?? null;
  const cprStatus: "good" | "warn" | "bad" | null =
    cpr == null || cplBom == null || cplAlerta == null
      ? null
      : cpr <= Number(cplBom)
        ? "good"
        : cpr <= Number(cplAlerta)
          ? "warn"
          : "bad";
  const cprStatusLabel =
    cprStatus === "good"
      ? `Saudável (≤ ${fmtBRL(Number(cplBom))})`
      : cprStatus === "warn"
        ? `Atenção (${fmtBRL(Number(cplBom))} – ${fmtBRL(Number(cplAlerta))})`
        : cprStatus === "bad"
          ? `Crítico (> ${fmtBRL(Number(cplAlerta))})`
          : null;
  const cprStatusClasses =
    cprStatus === "good"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : cprStatus === "warn"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
        : cprStatus === "bad"
          ? "bg-red-500/10 text-red-500 border-red-500/30"
          : "";

  // Build hierarchical tree: Campaign -> AdSet -> Ad
  type Agg = { spend: number; impressions: number; reach: number; clicks: number; results: number };
  const emptyAgg = (): Agg => ({ spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 });
  const addAgg = (a: Agg, r: any) => {
    a.spend += Number(r.spend || 0);
    a.impressions += r.impressions || 0;
    a.reach += r.reach || 0;
    a.clicks += r.clicks || 0;
    a.results += r.results || 0;
  };
  const tree = useMemo(() => {
    const camps = new Map<string, { name: string; totals: Agg; adsets: Map<string, { name: string; totals: Agg; ads: Map<string, { name: string; totals: Agg }> }> }>();
    for (const r of rows) {
      const cKey = r.campaign_name || "—";
      let c = camps.get(cKey);
      if (!c) { c = { name: cKey, totals: emptyAgg(), adsets: new Map() }; camps.set(cKey, c); }
      addAgg(c.totals, r);
      const sKey = r.adset_name || "—";
      let s = c.adsets.get(sKey);
      if (!s) { s = { name: sKey, totals: emptyAgg(), ads: new Map() }; c.adsets.set(sKey, s); }
      addAgg(s.totals, r);
      const aKey = r.ad_name || "—";
      let a = s.ads.get(aKey);
      if (!a) { a = { name: aKey, totals: emptyAgg() }; s.ads.set(aKey, a); }
      addAgg(a.totals, r);
    }
    const sortBySpend = <T extends { totals: Agg }>(arr: T[]) => arr.sort((x, y) => y.totals.spend - x.totals.spend);
    return sortBySpend(Array.from(camps.values()).map((c) => ({
      ...c,
      adsets: sortBySpend(Array.from(c.adsets.values()).map((s) => ({
        ...s,
        ads: sortBySpend(Array.from(s.ads.values())),
      }))),
    })));
  }, [rows]);

  const [expandedCamps, setExpandedCamps] = useState<Record<string, boolean>>({});
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
  const toggle = (m: Record<string, boolean>, set: (v: Record<string, boolean>) => void, k: string) =>
    set({ ...m, [k]: !m[k] });

  const totalAds = tree.reduce((acc, c) => acc + c.adsets.reduce((a, s) => a + s.ads.length, 0), 0);
  const rowCtr = (a: Agg) => (a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null);
  const rowCpm = (a: Agg) => (a.impressions > 0 ? (a.spend / a.impressions) * 1000 : null);
  const rowCpr = (a: Agg) => (a.results > 0 ? a.spend / a.results : null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const body: any = { since: from, until: to };
      const { data, error } = await supabase.functions.invoke("sync-meta-ads", { body });
      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);
      toast({
        title: "Sincronização concluída",
        description: `${result.accounts_processed} conta(s), ${result.total_upserted} registro(s) atualizado(s).`,
      });
      qc.invalidateQueries({ queryKey: ["meta_daily_ads"] });
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err.message || "Falha ao chamar sync-meta-ads",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const kpis = [
    { label: "Investimento", value: fmtBRL(totals.spend), icon: DollarSign },
    { label: totals.result_label, value: fmtNum(totals.results), icon: Target },
    {
      label: "Custo / resultado",
      value: cpr == null ? "—" : fmtBRL(cpr),
      icon: BadgeDollarSign,
      statusLabel: cprStatusLabel,
      statusClasses: cprStatusClasses,
    },
    { label: "CTR", value: fmtPct(ctr), icon: TrendingUp },
    { label: "CPM", value: cpm == null ? "—" : fmtBRL(cpm), icon: Eye },
    { label: "Cliques", value: fmtNum(totals.clicks), icon: MousePointerClick },
  ] as Array<{ label: string; value: string; icon: any; statusLabel?: string | null; statusClasses?: string }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Anúncios</h1>
          <p className="text-muted-foreground mt-1">Métricas de Meta Ads dos clientes</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar dados Meta"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta (cliente do CRM)</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Todas as contas</option>
              {profiles.map((p: any) => (
                <option key={p.user_id} value={p.user_id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
            <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">{k.value}</div>
                {k.statusLabel && (
                  <div className={`mt-2 inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${k.statusClasses}`}>
                    {k.statusLabel}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estrutura da campanha ({tree.length} campanha{tree.length !== 1 ? "s" : ""}, {totalAds} anúncio{totalAds !== 1 ? "s" : ""})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>
          ) : tree.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              Nenhum dado para o período. Vincule um cliente a uma conta Meta (campo <code>meta_ad_account_id</code>) e clique em "Sincronizar dados Meta".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3 text-right">Gasto</th>
                    <th className="py-2 pr-3 text-right">Resultado</th>
                    <th className="py-2 pr-3 text-right">Custo/result.</th>
                    <th className="py-2 pr-3 text-right">Alcance</th>
                    <th className="py-2 pr-3 text-right">Impressões</th>
                    <th className="py-2 pr-3 text-right">CTR</th>
                    <th className="py-2 pr-3 text-right">CPM</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.map((c, ci) => {
                    const cKey = `c-${ci}`;
                    const cOpen = !!expandedCamps[cKey];
                    return (
                      <FragmentRows key={cKey}>
                        <tr className="border-b border-border/50 hover:bg-muted/40 bg-muted/20">
                          <td className="py-2 pr-3">
                            <button
                              type="button"
                              onClick={() => toggle(expandedCamps, setExpandedCamps, cKey)}
                              className="inline-flex items-center gap-2 text-foreground font-semibold text-left max-w-[360px]"
                              title={c.name}
                            >
                              {cOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <span className="truncate">{c.name}</span>
                            </button>
                          </td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{fmtBRL(c.totals.spend)}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{fmtNum(c.totals.results)}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{rowCpr(c.totals) == null ? "—" : fmtBRL(rowCpr(c.totals)!)}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{fmtNum(c.totals.reach)}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{fmtNum(c.totals.impressions)}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{fmtPct(rowCtr(c.totals))}</td>
                          <td className="py-2 pr-3 text-right text-foreground font-semibold">{rowCpm(c.totals) == null ? "—" : fmtBRL(rowCpm(c.totals)!)}</td>
                        </tr>
                        {cOpen && c.adsets.map((s, si) => {
                          const sKey = `${cKey}-s-${si}`;
                          const sOpen = !!expandedSets[sKey];
                          return (
                            <FragmentRows key={sKey}>
                              <tr className="border-b border-border/50 hover:bg-muted/40">
                                <td className="py-2 pr-3 pl-6">
                                  <button
                                    type="button"
                                    onClick={() => toggle(expandedSets, setExpandedSets, sKey)}
                                    className="inline-flex items-center gap-2 text-foreground text-left max-w-[340px]"
                                    title={s.name}
                                  >
                                    {sOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                                    <span className="truncate">{s.name}</span>
                                  </button>
                                </td>
                                <td className="py-2 pr-3 text-right text-foreground">{fmtBRL(s.totals.spend)}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{fmtNum(s.totals.results)}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{rowCpr(s.totals) == null ? "—" : fmtBRL(rowCpr(s.totals)!)}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{fmtNum(s.totals.reach)}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{fmtNum(s.totals.impressions)}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{fmtPct(rowCtr(s.totals))}</td>
                                <td className="py-2 pr-3 text-right text-foreground">{rowCpm(s.totals) == null ? "—" : fmtBRL(rowCpm(s.totals)!)}</td>
                              </tr>
                              {sOpen && s.ads.map((a, ai) => (
                                <tr key={`${sKey}-a-${ai}`} className="border-b border-border/50 hover:bg-muted/40">
                                  <td className="py-2 pr-3 pl-12 text-muted-foreground max-w-[360px] truncate" title={a.name}>{a.name}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{fmtBRL(a.totals.spend)}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{fmtNum(a.totals.results)}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{rowCpr(a.totals) == null ? "—" : fmtBRL(rowCpr(a.totals)!)}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{fmtNum(a.totals.reach)}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{fmtNum(a.totals.impressions)}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{fmtPct(rowCtr(a.totals))}</td>
                                  <td className="py-2 pr-3 text-right text-muted-foreground">{rowCpm(a.totals) == null ? "—" : fmtBRL(rowCpm(a.totals)!)}</td>
                                </tr>
                              ))}
                            </FragmentRows>
                          );
                        })}
                      </FragmentRows>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to group multiple <tr> without extra DOM nodes
function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}