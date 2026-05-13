import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BadgeDollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [clienteId, setClienteId] = useState<string>("");
  const [adAccountFilter, setAdAccountFilter] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, meta_ad_account_id, cpl_limite_bom, cpl_limite_alerta")
        .not("meta_ad_account_id", "is", null)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const selectedCliente = clientes.find((c: any) => c.id === clienteId);
  const adAccountForFilter =
    adAccountFilter || (selectedCliente?.meta_ad_account_id ?? null);

  const { data: rows = [], isLoading } = useCampaignMetrics(from, to, adAccountForFilter);

  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientes) if (c.meta_ad_account_id) set.add(c.meta_ad_account_id);
    return Array.from(set);
  }, [clientes]);

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

  const cplBom = (selectedCliente as any)?.cpl_limite_bom ?? null;
  const cplAlerta = (selectedCliente as any)?.cpl_limite_alerta ?? null;
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

  // Aggregated by ad row
  const aggregated = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const key = `${r.campaign_name}__${r.adset_name}__${r.ad_name}`;
      const cur = map.get(key) || {
        campaign_name: r.campaign_name,
        adset_name: r.adset_name,
        ad_name: r.ad_name,
        result_type: r.result_type,
        spend: 0,
        impressions: 0,
        clicks: 0,
        results: 0,
      };
      cur.spend += Number(r.spend || 0);
      cur.impressions += r.impressions || 0;
      cur.clicks += r.clicks || 0;
      cur.results += r.results || 0;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : null,
        cost_per_result: row.results > 0 ? row.spend / row.results : null,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const body: any = { since: from, until: to };
      const adAccount = adAccountForFilter;
      if (adAccount) body.ad_account_id = adAccount;
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
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => { setClienteId(e.target.value); setAdAccountFilter(""); }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Conta Meta</label>
            <select
              value={adAccountFilter}
              onChange={(e) => setAdAccountFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">{selectedCliente?.meta_ad_account_id ? `(do cliente) ${selectedCliente.meta_ad_account_id}` : "Todas as contas"}</option>
              {accountOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <CardTitle className="text-lg">Anúncios ({aggregated.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>
          ) : aggregated.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              Nenhum dado para o período. Vincule um cliente a uma conta Meta (campo <code>meta_ad_account_id</code>) e clique em "Sincronizar dados Meta".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Campanha</th>
                    <th className="py-2 pr-3">Conjunto</th>
                    <th className="py-2 pr-3">Anúncio</th>
                    <th className="py-2 pr-3 text-right">Resultado</th>
                    <th className="py-2 pr-3 text-right">Custo / resultado</th>
                    <th className="py-2 pr-3 text-right">CTR</th>
                    <th className="py-2 pr-3 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/40">
                      <td className="py-2 pr-3 text-foreground max-w-[260px] truncate" title={r.campaign_name}>{r.campaign_name}</td>
                      <td className="py-2 pr-3 text-foreground max-w-[220px] truncate" title={r.adset_name}>{r.adset_name}</td>
                      <td className="py-2 pr-3 text-foreground max-w-[220px] truncate" title={r.ad_name}>{r.ad_name}</td>
                      <td className="py-2 pr-3 text-right text-foreground">{fmtNum(r.results)}</td>
                      <td className="py-2 pr-3 text-right text-foreground">{r.cost_per_result == null ? "—" : fmtBRL(r.cost_per_result)}</td>
                      <td className="py-2 pr-3 text-right text-foreground">{fmtPct(r.ctr)}</td>
                      <td className="py-2 pr-3 text-right text-foreground">{fmtBRL(r.spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}