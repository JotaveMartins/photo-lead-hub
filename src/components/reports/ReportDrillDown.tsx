import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, DollarSign, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface ReportDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  leads: Lead[];
  dateField?: keyof Lead;
  dateLabel?: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
};

const ReportDrillDown = ({ open, onOpenChange, title, leads, dateField = "created_at", dateLabel = "Data" }: ReportDrillDownProps) => {
  const navigate = useNavigate();
  const totalValue = leads.reduce((s, l) => s + (l.valor || 0), 0);

  const handleLeadClick = (leadId: string) => {
    onOpenChange(false);
    navigate(`/leads?open=${leadId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-display text-foreground">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({leads.length} {leads.length === 1 ? "negócio" : "negócios"})
            </span>
          </DialogTitle>
        </DialogHeader>

        {totalValue > 0 && (
          <div className="flex items-center gap-2 px-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-bold text-foreground">{fmt(totalValue)}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {leads.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Nenhum negócio nesta categoria</p>
          )}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-muted/50 border border-border rounded-lg p-3 space-y-1.5 cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => handleLeadClick(lead.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                    {lead.nome.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                {lead.valor && lead.valor > 0 && (
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">{fmt(lead.valor)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {lead.interesse && (
                  <span className="text-primary">{lead.interesse}</span>
                )}
                {lead.origem && (
                  <span>{lead.origem}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateLabel}: {fmtDate(lead[dateField] as string | null)}
                </span>
              </div>
              {lead.status === "Fechado Perdido" && lead.motivo_perda && (
                <p className="text-xs text-destructive">
                  Motivo: {lead.motivo_perda}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDrillDown;
