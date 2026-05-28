import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { ReportLead } from "@/hooks/useReportData";

const COLORS = [
  "hsl(142, 76%, 46%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(24, 95%, 53%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)",
  "hsl(60, 80%, 50%)",
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  ganhos: ReportLead[];
}

function aggregate(ganhos: ReportLead[], key: "origem" | "interesse") {
  const map = new Map<string, { count: number; valor: number }>();
  for (const l of ganhos) {
    const k = (l[key] as string | null) || "Sem informação";
    const prev = map.get(k) || { count: 0, valor: 0 };
    prev.count += 1;
    prev.valor += Number(l.valor || 0);
    map.set(k, prev);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, vendas: v.count, valor: v.valor }))
    .sort((a, b) => b.valor - a.valor);
}

function ChartCard({ title, data }: { title: string; data: { name: string; vendas: number; valor: number }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Sem vendas no período.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="valor"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, item: any) => [`${fmt(v)} (${item.payload.vendas} venda${item.payload.vendas > 1 ? "s" : ""})`, item.payload.name]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {data.map((d, i) => {
              const pct = total > 0 ? (d.valor / total) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground truncate" title={d.name}>{d.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-foreground font-medium">{fmt(d.valor)}</p>
                    <p className="text-muted-foreground">{d.vendas} venda{d.vendas > 1 ? "s" : ""} • {pct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevenueCompositionSection({ ganhos }: Props) {
  const porOrigem = useMemo(() => aggregate(ganhos, "origem"), [ganhos]);
  const porInteresse = useMemo(() => aggregate(ganhos, "interesse"), [ganhos]);

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <header className="flex items-center gap-2 mb-4">
        <PieIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Composição da Receita</h3>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Vendas por Origem" data={porOrigem} />
        <ChartCard title="Vendas por Interesse" data={porInteresse} />
      </div>
    </section>
  );
}