import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PILLARS, pillarLabel, type ScoredAccount } from "@/lib/usageScore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: ScoredAccount | null;
  previous: ScoredAccount | null;
  monthLabel: string;
}

const Delta = ({ current, prev }: { current: number; prev?: number }) => {
  if (prev === undefined) return null;
  const diff = current - prev;
  if (diff === 0) return <span className="text-muted-foreground inline-flex items-center text-xs"><Minus className="w-3 h-3" /></span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center text-xs ${up ? "text-green-500" : "text-destructive"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(diff)}
    </span>
  );
};

const UsageDetailDrawer = ({ open, onOpenChange, account, previous, monthLabel }: Props) => {
  if (!account) return null;
  const { row, score, pillarScores, top, bottom } = account;

  const ordered = [...PILLARS].sort(
    (a, b) => Number(row[b.key] ?? 0) - Number(row[a.key] ?? 0) || pillarScores[b.key] - pillarScores[a.key],
  );
  const max = Math.max(1, ...PILLARS.map((p) => Number(row[p.key] ?? 0)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row.nome || row.email || "Conta"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Score de uso · {monthLabel}</p>
              <p className="text-3xl font-bold text-foreground flex items-center gap-2">
                {score}
                <Delta current={score} prev={previous?.score} />
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Último acesso</p>
              <p className="text-sm text-foreground">
                {row.ultimo_acesso
                  ? format(new Date(row.ultimo_acesso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Nunca"}
              </p>
              <p className={`text-xs ${row.acessou_no_mes ? "text-green-500" : "text-destructive"}`}>
                {row.acessou_no_mes ? "Acessou no mês" : "Sem acesso no mês"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Onde mais mexeu</p>
              <p className="text-sm text-foreground">
                {top.length ? top.map(pillarLabel).join(", ") : "Nenhuma atividade no mês"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Onde não mexeu</p>
              <p className="text-sm text-foreground">
                {bottom.length ? bottom.map(pillarLabel).join(", ") : "Usou todas as áreas"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Uso por área</p>
            {ordered.map((p) => {
              const n = Number(row[p.key] ?? 0);
              const prevN = previous ? Number(previous.row[p.key] ?? 0) : undefined;
              return (
                <div key={p.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.label}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Delta current={n} prev={prevN} />
                      <span className="text-foreground font-medium">{n}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded bg-muted mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded ${n > 0 ? "bg-primary" : "bg-transparent"}`}
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UsageDetailDrawer;
