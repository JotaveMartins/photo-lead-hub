import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";

interface TasksSectionProps {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  cadenceCompleted: number;
  followUpCompleted: number;
  dailyCompleted: { date: string; count: number }[];
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
    <Icon className={`w-5 h-5 ${color}`} />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  </div>
);

const TasksSection = (props: TasksSectionProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Tarefas / Produtividade</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard icon={ListTodo} label="Total criadas" value={props.total} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Concluídas" value={props.completed} color="text-green-500" />
        <StatCard icon={Clock} label="Pendentes" value={props.pending} color="text-yellow-500" />
        <StatCard icon={AlertTriangle} label="Atrasadas" value={props.overdue} color="text-destructive" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Cadências concluídas</p>
          <p className="text-lg font-bold text-foreground">{props.cadenceCompleted}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Follow-ups concluídos</p>
          <p className="text-lg font-bold text-foreground">{props.followUpCompleted}</p>
        </div>
      </div>
      {props.dailyCompleted.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={props.dailyCompleted}>
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
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" name="Concluídas" fill="hsl(173, 80%, 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TasksSection;
