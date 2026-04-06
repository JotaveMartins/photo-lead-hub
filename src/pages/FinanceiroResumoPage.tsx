import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle, PieChart, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCobrancas, useAllCobrancas } from "@/hooks/useCobrancas";
import { useDespesas } from "@/hooks/useDespesas";
import { useNavigate } from "react-router-dom";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const FinanceiroResumoPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  const { data: cobrancas = [] } = useCobrancas(currentMonth);
  const { data: allCobrancas = [] } = useAllCobrancas();
  const { data: despesas = [] } = useDespesas(currentMonth);

  const today = new Date().toISOString().split("T")[0];

  // Cobranças metrics
  const recebidas = cobrancas.filter((c) => c.status === "paga");
  const recebidasValor = recebidas.reduce((sum, c) => sum + Number(c.valor), 0);

  const pendentes = cobrancas.filter((c) => c.status === "aguardando" && c.vencimento >= today);
  const pendentesValor = pendentes.reduce((sum, c) => sum + Number(c.valor), 0);

  const vencidas = cobrancas.filter((c) => c.status === "aguardando" && c.vencimento < today);
  const vencidasValor = vencidas.reduce((sum, c) => sum + Number(c.valor), 0);

  const totalCobrancas = cobrancas.reduce((sum, c) => sum + Number(c.valor), 0);

  // Despesas metrics
  const despesasPagas = despesas.filter((d) => d.status === "paga");
  const despesasPagasValor = despesasPagas.reduce((sum, d) => sum + Number(d.valor), 0);

  const despesasPrevistas = despesas.filter((d) => d.status === "prevista");
  const despesasPrevistasValor = despesasPrevistas.reduce((sum, d) => sum + Number(d.valor), 0);

  const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);

  // Lucro
  const lucro = recebidasValor - despesasPagasValor;
  const margemLucro = recebidasValor > 0 ? Math.round((lucro / recebidasValor) * 100) : 0;

  // Projeção
  const projecaoReceita = recebidasValor + pendentesValor;
  const projecaoLucro = projecaoReceita - totalDespesas;

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Chart data - Receitas vs Despesas
  const dreData = [
    { name: "Receitas", recebido: recebidasValor, pendente: pendentesValor },
    { name: "Despesas", recebido: despesasPagasValor, pendente: despesasPrevistasValor },
  ];

  // Pie chart - distribuição despesas por categoria
  const categoriaMap = new Map<string, number>();
  despesas.forEach((d) => {
    const cat = d.categoria || "Outros";
    categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + Number(d.valor));
  });
  const categoriaData = Array.from(categoriaMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = [
    "hsl(186, 100%, 60%)",
    "hsl(200, 90%, 55%)",
    "hsl(215, 85%, 50%)",
    "hsl(230, 80%, 55%)",
    "hsl(245, 75%, 60%)",
    "hsl(260, 70%, 55%)",
    "hsl(190, 95%, 45%)",
    "hsl(210, 80%, 65%)",
  ];

  const summaryCards = [
    {
      label: "Receita recebida",
      value: recebidasValor,
      sub: `${recebidas.length} cobranças pagas`,
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Receita pendente",
      value: pendentesValor + vencidasValor,
      sub: `${pendentes.length} pendentes · ${vencidas.length} vencidas`,
      icon: Clock,
      color: "text-[hsl(var(--status-warning))]",
      bgColor: "bg-[hsl(var(--status-warning))]/10",
    },
    {
      label: "Total despesas",
      value: totalDespesas,
      sub: `${despesasPagas.length} pagas · ${despesasPrevistas.length} previstas`,
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Lucro realizado",
      value: lucro,
      sub: `Margem: ${margemLucro}%`,
      icon: TrendingUp,
      color: lucro >= 0 ? "text-[hsl(var(--status-success))]" : "text-destructive",
      bgColor: lucro >= 0 ? "bg-[hsl(var(--status-success))]/10" : "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão geral da saúde financeira</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium capitalize min-w-[120px] text-center">{monthLabel}</span>
        <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.value < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {fmt(card.value)}
              </p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* DRE resumida + Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mini DRE */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Resultado do mês</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Receita recebida</span>
              <span className="text-sm font-medium text-foreground">{fmt(recebidasValor)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Receita pendente</span>
              <span className="text-sm font-medium text-[hsl(var(--status-warning))]">{fmt(pendentesValor)}</span>
            </div>
            {vencidasValor > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-destructive" /> Receita vencida
                </span>
                <span className="text-sm font-medium text-destructive">{fmt(vencidasValor)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm font-medium text-foreground">Total receita esperada</span>
              <span className="text-sm font-bold text-foreground">{fmt(totalCobrancas)}</span>
            </div>
            <div className="h-2" />
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">(-) Despesas pagas</span>
              <span className="text-sm font-medium text-destructive">{fmt(despesasPagasValor)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">(-) Despesas previstas</span>
              <span className="text-sm font-medium text-muted-foreground">{fmt(despesasPrevistasValor)}</span>
            </div>
            <div className="h-2" />
            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-lg px-3">
              <span className="text-sm font-bold text-foreground">Lucro realizado</span>
              <span className={`text-lg font-bold ${lucro >= 0 ? 'text-[hsl(var(--status-success))]' : 'text-destructive'}`}>
                {fmt(lucro)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3">
              <span className="text-xs font-medium text-muted-foreground">Projeção de lucro (se tudo for recebido)</span>
              <span className={`text-sm font-semibold ${projecaoLucro >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {fmt(projecaoLucro)}
              </span>
            </div>
          </div>
        </div>

        {/* Distribuição de despesas */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Despesas por categoria</h2>
          {categoriaData.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPie>
                    <Pie
                      data={categoriaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={120}
                      dataKey="value"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categoriaData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const pct = totalDespesas > 0 ? ((value / totalDespesas) * 100).toFixed(1) : "0";
                        return [`${fmt(value)} (${pct}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ display: "none" }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{fmt(totalDespesas)}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {categoriaData.map((cat, idx) => {
                  const pct = totalDespesas > 0 ? ((cat.value / totalDespesas) * 100).toFixed(0) : "0";
                  return (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-muted-foreground">{cat.name}</span>
                      <span className="font-medium text-foreground">{fmt(cat.value)} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <PieChart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma despesa registrada neste mês</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/financeiro/cobrancas")}
          className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Cobranças</p>
              <p className="text-xs text-muted-foreground">{cobrancas.length} cobranças neste mês</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <button
          onClick={() => navigate("/financeiro/despesas")}
          className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Despesas</p>
              <p className="text-xs text-muted-foreground">{despesas.length} despesas neste mês</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default FinanceiroResumoPage;
