import { useLeads } from "@/hooks/useLeads";
import { MessageSquare, UserPlus, Calendar, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const RecentActivityDB = () => {
  const { data: leads = [] } = useLeads();

  // Get recent leads sorted by updated_at
  const recentLeads = leads
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const getActivityIcon = (status: string) => {
    switch (status) {
      case "Em andamento":
        return <CheckCircle className="w-4 h-4 text-status-success" />;
      case "Fechado":
        return <CheckCircle className="w-4 h-4 text-status-success" />;
      case "Interessado sem resposta":
        return <MessageSquare className="w-4 h-4 text-status-warning" />;
      default:
        return <UserPlus className="w-4 h-4 text-primary" />;
    }
  };

  const getActivityText = (lead: typeof recentLeads[0]) => {
    switch (lead.status) {
      case "Em andamento":
        return `${lead.nome} está em andamento`;
      case "Fechado":
        return `${lead.nome} foi fechado`;
      case "Interessado sem resposta":
        return `${lead.nome} aguardando resposta`;
      case "Sem interesse":
        return `${lead.nome} não teve interesse`;
      default:
        return `${lead.nome} foi adicionado`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        Atividade Recente
      </h3>

      {recentLeads.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma atividade recente
        </p>
      ) : (
        <div className="space-y-4">
          {recentLeads.map((lead) => (
            <div key={lead.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {getActivityIcon(lead.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {getActivityText(lead)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivityDB;
