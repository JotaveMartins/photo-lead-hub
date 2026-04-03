import { DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import type { Cobranca } from "@/hooks/useCobrancas";

interface CobrancaCardsProps {
  cobrancas: Cobranca[];
  allCobrancas: Cobranca[];
}

const CobrancaCards = ({ cobrancas, allCobrancas }: CobrancaCardsProps) => {
  const today = new Date().toISOString().split("T")[0];

  const recebidas = allCobrancas
    .filter((c) => c.status === "paga")
    .reduce((sum, c) => sum + Number(c.valor), 0);

  const recebimentoMes = cobrancas
    .filter((c) => c.status === "paga")
    .reduce((sum, c) => sum + Number(c.valor), 0);

  const pendentes = cobrancas
    .filter((c) => c.status === "aguardando" && c.vencimento >= today);
  const pendentesValor = pendentes.reduce((sum, c) => sum + Number(c.valor), 0);

  const vencidas = cobrancas
    .filter((c) => c.status === "aguardando" && c.vencimento < today);
  const vencidasValor = vencidas.reduce((sum, c) => sum + Number(c.valor), 0);

  const totalMes = cobrancas.reduce((sum, c) => sum + Number(c.valor), 0);
  const metaPct = totalMes > 0 ? Math.round((recebimentoMes / totalMes) * 100) : 0;

  const cards = [
    {
      label: "Recebidas",
      value: recebidas,
      sub: `${allCobrancas.filter((c) => c.status === "paga").length} parcelas recebidas`,
      color: "text-primary",
      barColor: "bg-primary",
      icon: DollarSign,
    },
    {
      label: "Recebimento deste mês",
      value: recebimentoMes,
      sub: `Meta do mês: ${metaPct}%`,
      subRight: `Faltam R$ ${(totalMes - recebimentoMes).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      color: "text-primary",
      barColor: "bg-primary",
      icon: TrendingUp,
    },
    {
      label: "Parcelas pendentes",
      value: pendentesValor,
      sub: `${pendentes.length} parcelas aguardando`,
      color: "text-[hsl(var(--status-warning))]",
      barColor: "bg-[hsl(var(--status-warning))]",
      icon: Clock,
    },
    {
      label: "Parcelas vencidas",
      value: vencidasValor,
      sub: `${vencidas.length} parcelas em atraso`,
      color: "text-destructive",
      barColor: "bg-destructive",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border border-border ${card.color}`}>
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color} opacity-60`} />
            </div>
            <p className="text-2xl font-bold text-foreground">
              R$ {Number(card.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <div className={`h-1 rounded-full ${card.barColor} opacity-40`} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{card.sub}</span>
              {card.subRight && <span>{card.subRight}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CobrancaCards;
