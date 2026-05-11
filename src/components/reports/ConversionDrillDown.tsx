import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

export interface ConversionItem {
  lead: Lead;
  startTs: string;
  endTs: string;
  days: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  startLabel: string;
  endLabel: string;
  items: ConversionItem[];
  averageDays: number | null;
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

const ConversionDrillDown = ({ open, onOpenChange, title, startLabel, endLabel, items, averageDays }: Props) => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    onOpenChange(false);
    navigate(`/leads?open=${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-display text-foreground">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({items.length} {items.length === 1 ? "lead" : "leads"}
              {averageDays !== null && ` · média ${averageDays.toFixed(1)} dias`})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum lead</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 pr-2">Lead</th>
                  <th className="text-left font-medium py-2 px-2">{startLabel}</th>
                  <th className="text-left font-medium py-2 px-2">{endLabel}</th>
                  <th className="text-right font-medium py-2 pl-2">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.lead.id}
                    className="border-b border-border/50 hover:bg-muted/40 cursor-pointer group"
                    onClick={() => handleClick(it.lead.id)}
                  >
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-foreground truncate">{it.lead.nome}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{fmtDate(it.startTs)}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{fmtDate(it.endTs)}</td>
                    <td className="py-2 pl-2 text-right font-semibold text-foreground whitespace-nowrap">
                      {it.days.toFixed(1)} dias
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversionDrillDown;