import { Clock } from "lucide-react";

interface ConversionTimeSectionProps {
  leadToProposal: number | null;
  proposalToWon: number | null;
  leadToWon: number | null;
  onMetricClick?: (key: "leadToProposal" | "proposalToWon" | "leadToWon") => void;
}

const ConversionTimeSection = ({ leadToProposal, proposalToWon, leadToWon, onMetricClick }: ConversionTimeSectionProps) => {
  const formatDays = (v: number | null) => (v !== null ? `${v.toFixed(1)} dias` : "—");
  const cardCls = (clickable: boolean) =>
    `flex items-center gap-3 bg-muted/30 rounded-lg p-4 transition-colors ${clickable ? "cursor-pointer hover:border hover:border-primary/50" : ""}`;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-semibold text-foreground mb-6">Tempo Médio de Conversão</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cardCls(!!onMetricClick && leadToProposal !== null)} onClick={() => onMetricClick && leadToProposal !== null && onMetricClick("leadToProposal")}>
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Lead → Proposta</p>
            <p className="text-xl font-bold text-foreground">{formatDays(leadToProposal)}</p>
          </div>
        </div>
        <div className={cardCls(!!onMetricClick && proposalToWon !== null)} onClick={() => onMetricClick && proposalToWon !== null && onMetricClick("proposalToWon")}>
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Proposta → Ganho</p>
            <p className="text-xl font-bold text-foreground">{formatDays(proposalToWon)}</p>
          </div>
        </div>
        <div className={cardCls(!!onMetricClick && leadToWon !== null)} onClick={() => onMetricClick && leadToWon !== null && onMetricClick("leadToWon")}>
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Lead → Venda</p>
            <p className="text-xl font-bold text-foreground">{formatDays(leadToWon)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionTimeSection;
