import { Lead, getStatusColor } from "@/data/leads";

interface LeadStatusBadgeProps {
  status: Lead['status'];
}

const LeadStatusBadge = ({ status }: LeadStatusBadgeProps) => {
  const colorType = getStatusColor(status);
  
  const getStyles = () => {
    switch (colorType) {
      case 'success':
        return 'bg-status-success/15 text-status-success border-status-success/30';
      case 'warning':
        return 'bg-status-warning/15 text-status-warning border-status-warning/30';
      case 'danger':
        return 'bg-status-danger/15 text-status-danger border-status-danger/30';
      case 'info':
        return 'bg-status-info/15 text-status-info border-status-info/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'Em andamento':
        return 'Em andamento';
      case 'Interessado sem resposta':
        return 'Aguardando';
      case 'Sem resposta':
        return 'Sem resposta';
      case 'Sem interesse':
        return 'Perdido';
      case 'Indisponibilidade Agenda':
        return 'Indisponível';
      case 'Fechado':
        return 'Fechado';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStyles()}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        colorType === 'success' ? 'bg-status-success' :
        colorType === 'warning' ? 'bg-status-warning' :
        colorType === 'danger' ? 'bg-status-danger' :
        colorType === 'info' ? 'bg-status-info' : 'bg-muted-foreground'
      }`} />
      {getLabel()}
    </span>
  );
};

export default LeadStatusBadge;
