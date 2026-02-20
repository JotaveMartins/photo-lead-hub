import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown } from "lucide-react";

interface LossSectionProps {
  totalLost: number;
  byReason: { motivo: string; count: number; percent: number }[];
}

const LossSection = ({ totalLost, byReason }: LossSectionProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-destructive" /> Perdas
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Total de negócios perdidos: <span className="font-bold text-foreground">{totalLost}</span>
      </p>
      {byReason.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma perda no período</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byReason} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <YAxis type="category" dataKey="motivo" stroke="hsl(var(--muted-foreground))" width={140} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.percent.toFixed(1)}%)`, "Perdas"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {byReason.map((_, i) => (
                  <Cell key={i} fill="hsl(0, 84%, 60%)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default LossSection;
