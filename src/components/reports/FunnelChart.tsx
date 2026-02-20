interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

const FUNNEL_COLORS = [
  "hsl(260, 80%, 60%)",
  "hsl(265, 70%, 55%)",
  "hsl(270, 65%, 50%)",
  "hsl(280, 55%, 48%)",
  "hsl(290, 50%, 45%)",
  "hsl(300, 45%, 42%)",
  "hsl(310, 50%, 50%)",
];

const FunnelChart = ({ steps }: FunnelChartProps) => {
  if (!steps.length) return null;

  const firstValue = steps[0]?.value || 0;
  const lastValue = steps[steps.length - 1]?.value || 0;

  // Find proposal step for proposal > sale conversion
  const propostaStep = steps.find(s =>
    s.label.toLowerCase().includes("proposta")
  );

  const leadToSale = firstValue > 0 ? ((lastValue / firstValue) * 100).toFixed(0) : "0";
  const propostaToSale = propostaStep && propostaStep.value > 0
    ? ((lastValue / propostaStep.value) * 100).toFixed(0)
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Funil de Vendas</h3>

      <div className="flex flex-col items-center gap-1">
        {steps.map((step, i) => {
          // Width goes from 100% at top to ~40% at bottom
          const widthPercent = steps.length > 1
            ? 100 - ((i / (steps.length - 1)) * 55)
            : 100;

          const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
          const nextColor = FUNNEL_COLORS[(i + 1) % FUNNEL_COLORS.length];

          return (
            <div
              key={step.label}
              className="relative flex flex-col items-center justify-center py-3 text-center transition-all"
              style={{
                width: `${widthPercent}%`,
                minHeight: "56px",
                background: `linear-gradient(180deg, ${color}, ${nextColor})`,
                clipPath: i === steps.length - 1
                  ? "polygon(5% 0%, 95% 0%, 90% 100%, 10% 100%)"
                  : "polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)",
                borderRadius: i === 0 ? "8px 8px 0 0" : undefined,
              }}
            >
              <span className="text-lg font-bold text-white drop-shadow-sm">
                {step.value}
              </span>
              <span className="text-xs text-white/80 font-medium">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {steps.length >= 2 && (
        <div className="flex items-center justify-center gap-8 mt-5 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Lead → Venda</p>
            <p className="text-xl font-bold text-foreground">{leadToSale}%</p>
          </div>
          {propostaToSale && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Proposta → Venda</p>
              <p className="text-xl font-bold text-foreground">{propostaToSale}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
