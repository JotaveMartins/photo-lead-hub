import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { PILLARS, pillarLabel, type ScoredAccount } from "@/lib/usageScore";
import UsageDetailDrawer from "@/components/admin/UsageDetailDrawer";
import { usePrivacyMode, maskName } from "@/hooks/usePrivacyMode";

const lastClosedMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
};

const ScoreDelta = ({ current, prev }: { current: number; prev?: number }) => {
  if (prev === undefined) return null;
  const diff = current - prev;
  if (diff === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center text-xs ${up ? "text-green-500" : "text-destructive"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(diff)}
    </span>
  );
};

type AdocaoStatus = "Engajado" | "Uso parcial" | "Inativo";

const adocaoStatus = (a: ScoredAccount): AdocaoStatus => {
  if (!a.row.acessou_no_mes) return "Inativo";
  return a.score >= 10 ? "Engajado" : "Uso parcial";
};

const STATUS_CLASS: Record<AdocaoStatus, string> = {
  Engajado: "bg-green-500/10 text-green-500 border-green-500/30",
  "Uso parcial": "bg-amber-500/10 text-amber-500 border-amber-500/30",
  Inativo: "bg-destructive/10 text-destructive border-destructive/30",
};

const StatusBadge = ({ status }: { status: AdocaoStatus }) => (
  <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASS[status]}`}>
    {status}
  </span>
);

const UsageTab = () => {
  const [month, setMonth] = useState<Date>(lastClosedMonth());
  const [selected, setSelected] = useState<ScoredAccount | null>(null);
  const { accounts, previousByUser, isLoading } = useUsageMetrics(month);
  const { enabled: privacy } = usePrivacyMode();

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  const isCurrentOrFuture = month >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const media = useMemo(
    () => (accounts.length ? Math.round(accounts.reduce((s, a) => s + a.score, 0) / accounts.length) : 0),
    [accounts],
  );
  const semAcesso = accounts.filter((a) => !a.row.acessou_no_mes).length;
  const taxaAdocao = useMemo(() => {
    if (!accounts.length) return 0;
    const engajados = accounts.filter((a) => adocaoStatus(a) === "Engajado").length;
    return Math.round((engajados / accounts.length) * 100);
  }, [accounts]);


  const exportCsv = () => {
    const header = ["Conta", "Email", "Score", "Score mês anterior", "Acessou no mês", ...PILLARS.map((p) => p.label)];
    const lines = accounts.map((a) => [
      a.row.nome ?? "",
      a.row.email ?? "",
      a.score,
      previousByUser.get(a.row.user_id)?.score ?? "",
      a.row.acessou_no_mes ? "Sim" : "Não",
      ...PILLARS.map((p) => Number(a.row[p.key] ?? 0)),
    ]);
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `uso-crm-${format(month, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Uso do CRM</h1>
          <p className="text-muted-foreground">Engajamento de cada conta no mês fechado</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm capitalize min-w-[130px] text-center">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isCurrentOrFuture}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!accounts.length}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Contas analisadas</p>
          <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Taxa de adoção</p>
          <p className="text-2xl font-bold text-foreground">{taxaAdocao}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Score médio</p>
          <p className="text-2xl font-bold text-foreground">{media}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sem acesso no mês</p>
          <p className="text-2xl font-bold text-foreground">{semAcesso}</p>
        </div>
      </div>


      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead className="w-24">Score</TableHead>
              <TableHead className="whitespace-nowrap">Status de adoção</TableHead>

              {PILLARS.map((p) => (
                <TableHead key={p.key} className="text-center whitespace-nowrap">{p.label}</TableHead>
              ))}
              <TableHead className="whitespace-nowrap">Mais / menos usado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={PILLARS.length + 4} className="text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={PILLARS.length + 4} className="text-center text-muted-foreground">Nenhuma conta no período</TableCell>
              </TableRow>
            ) : (
              accounts.map((a, idx) => (
                <TableRow key={a.row.user_id} className="cursor-pointer" onClick={() => setSelected(a)}>
                  <TableCell>
                    <p className="font-medium text-foreground">{privacy ? maskName(idx) : a.row.nome || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.row.acessou_no_mes ? "Acessou no mês" : "Sem acesso no mês"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{a.score}</span>
                      <ScoreDelta current={a.score} prev={previousByUser.get(a.row.user_id)?.score} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={adocaoStatus(a)} />
                  </TableCell>

                  {PILLARS.map((p) => {
                    const n = Number(a.row[p.key] ?? 0);
                    return (
                      <TableCell key={p.key} className={`text-center ${n === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                        {n}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs">
                    <span className="text-green-500">{a.top.map(pillarLabel).join(", ") || "—"}</span>
                    <br />
                    <span className="text-muted-foreground">{a.bottom.map(pillarLabel).join(", ") || "—"}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UsageDetailDrawer
        open={!!selected}
        onOpenChange={(v) => { if (!v) setSelected(null); }}
        account={selected}
        previous={selected ? previousByUser.get(selected.row.user_id) ?? null : null}
        monthLabel={monthLabel}
      />
    </>
  );
};

export default UsageTab;
