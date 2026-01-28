import { MessageSquare, Send, CheckCircle, XCircle, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: 'message' | 'proposal' | 'closed' | 'lost' | 'followup';
  leadName: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'proposal',
    leadName: 'Sara',
    description: 'Proposta enviada para Casamento 2028',
    time: '2 horas atrás'
  },
  {
    id: '2',
    type: 'followup',
    leadName: 'Thamiris',
    description: 'Follow-up agendado para amanhã',
    time: '4 horas atrás'
  },
  {
    id: '3',
    type: 'message',
    leadName: 'Veronica',
    description: 'Nova mensagem recebida',
    time: '5 horas atrás'
  },
  {
    id: '4',
    type: 'lost',
    leadName: 'Elania',
    description: 'Lead perdido - Fechou com um amigo',
    time: '1 dia atrás'
  },
  {
    id: '5',
    type: 'closed',
    leadName: 'Isabella',
    description: 'Contrato fechado - Pacote 1',
    time: '2 dias atrás'
  }
];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'message':
      return { icon: MessageSquare, color: 'text-status-info bg-status-info/10' };
    case 'proposal':
      return { icon: Send, color: 'text-primary bg-primary/10' };
    case 'closed':
      return { icon: CheckCircle, color: 'text-status-success bg-status-success/10' };
    case 'lost':
      return { icon: XCircle, color: 'text-status-danger bg-status-danger/10' };
    case 'followup':
      return { icon: Clock, color: 'text-status-warning bg-status-warning/10' };
  }
};

const RecentActivity = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        Atividade Recente
      </h3>
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const { icon: Icon, color } = getActivityIcon(activity.type);
          
          return (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`p-2 rounded-lg ${color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.leadName}</span>
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        Ver todas as atividades →
      </button>
    </div>
  );
};

export default RecentActivity;
