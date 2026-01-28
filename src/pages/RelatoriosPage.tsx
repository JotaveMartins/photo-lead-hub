import { BarChart3, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const RelatoriosPage = () => {
  const { data: leads = [] } = useLeads();

  // Calculate statistics
  const totalLeads = leads.length;
  const emAndamento = leads.filter((l) => l.status === "Em andamento").length;
  const fechados = leads.filter((l) => l.status === "Fechado").length;
  const perdidos = leads.filter((l) => l.status === "Sem interesse").length;
  const aguardando = leads.filter((l) => l.status === "Interessado sem resposta").length;
  const semResposta = leads.filter((l) => l.status === "Sem resposta").length;

  const taxaConversao = totalLeads > 0 ? Math.round(((fechados + emAndamento) / totalLeads) * 100) : 0;
  const taxaPerda = totalLeads > 0 ? Math.round((perdidos / totalLeads) * 100) : 0;

  // Data for pie chart
  const statusData = [
    { name: "Em andamento", value: emAndamento, color: "hsl(142, 76%, 46%)" },
    { name: "Fechados", value: fechados, color: "hsl(173, 80%, 60%)" },
    { name: "Aguardando", value: aguardando, color: "hsl(38, 92%, 50%)" },
    { name: "Sem resposta", value: semResposta, color: "hsl(215, 20%, 45%)" },
    { name: "Perdidos", value: perdidos, color: "hsl(0, 84%, 60%)" },
  ].filter((d) => d.value > 0);

  // Data for bar chart (leads by interesse/package)
  const interesseCount: Record<string, number> = {};
  leads.forEach((lead) => {
    const interesse = lead.interesse || "Sem interesse definido";
    interesseCount[interesse] = (interesseCount[interesse] || 0) + 1;
  });
  const interesseData = Object.entries(interesseCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Relatórios
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise de performance e conversão
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalLeads}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-status-success mt-1">{taxaConversao}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-status-success opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Perda</p>
              <p className="text-2xl font-bold text-status-danger mt-1">{taxaPerda}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-status-danger opacity-50 rotate-180" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fechados</p>
              <p className="text-2xl font-bold text-foreground mt-1">{fechados}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-foreground mb-6">
            Distribuição por Status
          </h3>
          
          {statusData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Nenhum dado disponível
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(222 47% 8%)", 
                      border: "1px solid hsl(222 30% 18%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Package */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-foreground mb-6">
            Leads por Pacote
          </h3>
          
          {interesseData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Nenhum dado disponível
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interesseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
                  <XAxis type="number" stroke="hsl(215 20% 55%)" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(215 20% 55%)"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(222 47% 8%)", 
                      border: "1px solid hsl(222 30% 18%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(173, 80%, 60%)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RelatoriosPage;
