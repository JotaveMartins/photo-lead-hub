interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  onStepClick?: (label: string) => void;
}

const FUNNEL_COLORS = [
  { from: "hsl(173, 80%, 55%)", to: "hsl(173, 80%, 48%)" },
  { from: "hsl(180, 70%, 45%)", to: "hsl(185, 65%, 40%)" },
  { from: "hsl(190, 65%, 38%)", to: "hsl(195, 60%, 34%)" },
  { from: "hsl(200, 60%, 32%)", to: "hsl(205, 55%, 28%)" },
  { from: "hsl(210, 55%, 26%)", to: "hsl(215, 50%, 22%)" },
  { from: "hsl(220, 50%, 22%)", to: "hsl(222, 47%, 18%)" },
  { from: "hsl(222, 47%, 16%)", to: "hsl(222, 47%, 12%)" },
];

const FunnelChart = ({ steps, onStepClick }: FunnelChartProps) => {
  if (!steps.length) return null;

  const firstValue = steps[0]?.value || 0;
  const lastValue = steps[steps.length - 1]?.value || 0;

  const propostaStep = steps.find(s =>
    s.label.toLowerCase().includes("proposta")
  );

  const leadToSale = firstValue > 0 ? ((lastValue / firstValue) * 100).toFixed(1) : "0";
  const propostaToSale = propostaStep && propostaStep.value > 0
    ? ((lastValue / propostaStep.value) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Funil de Vendas</h3>

      <div className="flex items-stretch gap-4">
        <div className="flex flex-col items-center gap-0 flex-1 max-w-[70%]">
        {steps.map((step, i) => {
          const topWidth = steps.length > 1
            ? 100 - ((i / (steps.length - 1)) * 50)
            : 100;
          const bottomWidth = steps.length > 1
            ? 100 - (((i + 1) / (steps.length - 1)) * 50)
            : 100;

          const colors = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;

          const topInset = ((100 - topWidth) / 2);
          const bottomInset = ((100 - bottomWidth) / 2);

          const clipPath = isLast
            ? `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 80%, 50% 100%, ${bottomInset}% 80%)`
            : `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`;

          return (
            <div
              key={step.label}
              className={`relative flex items-center justify-center text-center transition-all group ${onStepClick && step.value > 0 ? "cursor-pointer hover:brightness-110" : ""}`}
              style={{
                width: "100%",
                minHeight: isLast ? "68px" : "58px",
                background: `linear-gradient(180deg, ${colors.from}, ${colors.to})`,
                clipPath,
                borderRadius: isFirst ? "12px 12px 0 0" : undefined,
                marginTop: i > 0 ? "-1px" : undefined,
              }}
              onClick={() => onStepClick && step.value > 0 && onStepClick(step.label)}
            >
              <div className="flex items-center gap-3 z-10">
                <span className="text-xl font-bold text-white drop-shadow-md">
                  {step.value}
                </span>
                <span className="text-sm text-white/85 font-medium">
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
        </div>
        <div className="flex flex-col w-32 shrink-0">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const prev = i > 0 ? steps[i - 1].value : null;
            const rate = prev != null && prev > 0 ? ((step.value / prev) * 100).toFixed(1) : null;
            return (
              <div
                key={step.label}
                className="flex items-center justify-start"
                style={{ minHeight: isLast ? "68px" : "58px" }}
              >
                {rate != null ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                      {steps[i - 1].label} →
                    </p>
                    <p className="text-base font-bold text-primary">{rate}%</p>
                  </div>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Topo do funil</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {steps.length >= 2 && (
        <div className="flex items-center justify-center gap-10 mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Lead → Venda</p>
            <p className="text-2xl font-bold text-primary">{leadToSale}%</p>
          </div>
          {propostaToSale && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Proposta → Venda</p>
              <p className="text-2xl font-bold text-accent">{propostaToSale}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
