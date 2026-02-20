interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

const FunnelChart = ({ steps }: FunnelChartProps) => {
  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Funil de Vendas</h3>
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 8);
          const prevValue = i > 0 ? steps[i - 1].value : null;
          const convPercent = prevValue && prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : null;

          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-[130px] text-sm text-muted-foreground text-right shrink-0 truncate">
                {step.label}
              </div>
              <div className="flex-1 relative">
                <div
                  className="h-9 rounded-md bg-primary/80 flex items-center px-3 transition-all"
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-sm font-semibold text-primary-foreground">{step.value}</span>
                </div>
              </div>
              <div className="w-[60px] text-xs text-muted-foreground shrink-0">
                {convPercent ? `${convPercent}%` : ""}
              </div>
            </div>
          );
        })}
      </div>
      {steps.length >= 2 && (
        <div className="mt-4 text-sm text-muted-foreground text-right">
          Conversão final: <span className="font-semibold text-foreground">
            {steps[0].value > 0 ? ((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(1) : "0"}%
          </span>
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
