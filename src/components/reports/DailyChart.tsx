import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DailyChartProps {
  data: { date: string; leads: number; propostas: number; ganhos: number }[];
}

const DailyChart = ({ data }: DailyChartProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Leads, Propostas e Ganhos por Dia</h3>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum dado no período</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              <Bar dataKey="leads" name="Leads" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="propostas" name="Propostas" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ganhos" name="Ganhos" fill="hsl(142, 76%, 46%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DailyChart;
