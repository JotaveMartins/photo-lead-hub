import { useLeads } from "@/hooks/useLeads";
import { Calendar, MapPin } from "lucide-react";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

const UpcomingEventsDB = () => {
  const { data: leads = [] } = useLeads();

  // Get leads with future events
  const upcomingEvents = leads
    .filter((lead) => lead.data_evento && isFuture(parseLocalDate(lead.data_evento)))
    .sort((a, b) => parseLocalDate(a.data_evento!).getTime() - parseLocalDate(b.data_evento!).getTime())
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        Próximos Eventos
      </h3>

      {upcomingEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum evento agendado
        </p>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map((lead) => (
            <div
              key={lead.id}
              className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {lead.nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.interesse || "Evento"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-primary">
                    {format(parseLocalDate(lead.data_evento!), "dd MMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseLocalDate(lead.data_evento!), "yyyy")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingEventsDB;
