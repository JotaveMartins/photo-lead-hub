import { Calendar, MapPin } from "lucide-react";
import { leads } from "@/data/leads";

const UpcomingEvents = () => {
  // Get leads with upcoming events, sorted by date
  const upcomingLeads = leads
    .filter(lead => lead.dataEvento)
    .sort((a, b) => {
      if (!a.dataEvento || !b.dataEvento) return 0;
      const [dayA, monthA, yearA] = a.dataEvento.split('/').map(Number);
      const [dayB, monthB, yearB] = b.dataEvento.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    })
    .slice(0, 4);

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { day, month: months[parseInt(month) - 1], year };
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Próximos Eventos
        </h3>
        <Calendar className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="space-y-3">
        {upcomingLeads.map((lead, index) => {
          const date = lead.dataEvento ? formatDate(lead.dataEvento) : null;
          
          return (
            <div 
              key={lead.id} 
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {date && (
                <div className="text-center min-w-[50px]">
                  <p className="text-2xl font-display font-bold text-foreground">{date.day}</p>
                  <p className="text-xs text-muted-foreground uppercase">{date.month}</p>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{lead.nome}</p>
                <p className="text-sm text-muted-foreground truncate">{lead.interesse}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        Ver calendário completo →
      </button>
    </div>
  );
};

export default UpcomingEvents;
