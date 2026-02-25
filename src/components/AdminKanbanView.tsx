import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { parseLocalDate } from "@/lib/utils";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "Novo Lead", label: "Novo Lead", color: "bg-[hsl(var(--status-info))]" },
  { status: "Contato Iniciado", label: "Contato Iniciado", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Proposta Enviada", label: "Proposta Enviada", color: "bg-primary" },
  { status: "Follow-up", label: "Follow-up", color: "bg-[hsl(var(--status-warning))]" },
  { status: "Contrato Enviado", label: "Contrato Enviado", color: "bg-accent" },
  { status: "Fechado Ganho", label: "Ganho", color: "bg-[hsl(var(--status-success))]" },
  { status: "Fechado Perdido", label: "Perdido", color: "bg-[hsl(var(--status-danger))]" },
];

interface AdminKanbanViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const AdminKanbanView = ({ open, onOpenChange, userId, userName }: AdminKanbanViewProps) => {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: open && !!userId,
  });

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return parseLocalDate(d).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Funil de {userName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1" style={{ minHeight: "50vh" }}>
            {COLUMNS.map((col) => {
              const columnLeads = leads.filter((l) => l.status === col.status);
              const totalValue = columnLeads.reduce((sum, l) => sum + (l.valor || 0), 0);

              return (
                <div
                  key={col.status}
                  className="flex-shrink-0 w-64 bg-card border border-border rounded-xl flex flex-col"
                >
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="text-sm font-semibold text-foreground">{col.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                    </div>
                    {totalValue > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(totalValue)}
                      </p>
                    )}
                  </div>

                  <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-muted border border-border/50 rounded-lg p-3"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.whatsapp}
                          </p>
                          {lead.valor && lead.valor > 0 && (
                            <p className="text-xs font-medium text-foreground">
                              {formatCurrency(lead.valor)}
                            </p>
                          )}
                          {lead.interesse && (
                            <p className="text-xs text-primary truncate">{lead.interesse}</p>
                          )}
                          {lead.data_evento && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(lead.data_evento)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminKanbanView;
