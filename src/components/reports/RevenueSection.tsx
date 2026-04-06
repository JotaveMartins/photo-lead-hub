import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign } from "lucide-react";

interface RevenueSectionProps {
  total: number;
  ticketMedio: number;
  dailyData: { date: string; receita: number }[];
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const RevenueSection = ({ total, ticketMedio, dailyData }: RevenueSectionProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Receita</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
          <DollarSign className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-xl font-bold text-foreground">{fmt(total)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
          <DollarSign className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-xl font-bold text-foreground">{fmt(ticketMedio)}</p>
          </div>
        </div>
      </div>
      {dailyData.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(142, 76%, 46%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RevenueSection;
