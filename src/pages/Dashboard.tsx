import { useState } from "react";
import { Users, Calendar, Clock, UserCheck } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import StatsCard from "@/components/StatsCard";
import LeadsTableDB from "@/components/LeadsTableDB";
import RecentActivityDB from "@/components/RecentActivityDB";
import UpcomingEventsDB from "@/components/UpcomingEventsDB";
import LeadModal from "@/components/LeadModal";
import { useLeads } from "@/hooks/useLeads";

const Dashboard = () => {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const { data: leads = [] } = useLeads();

  // Calculate stats from leads data
  const totalLeads = leads.length;
  const emAndamento = leads.filter(l => l.status === "Em andamento").length;
  const aguardando = leads.filter(l => l.status === "Interessado sem resposta").length;
  const comEvento = leads.filter(l => l.data_evento).length;
  const taxaConversao = totalLeads > 0 ? Math.round((emAndamento / totalLeads) * 100) : 0;

  return (
    <>
      <DashboardHeader onNewLead={() => setIsLeadModalOpen(true)} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total de Leads"
          value={totalLeads}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          variant="primary"
        />
        <StatsCard
          title="Em Andamento"
          value={emAndamento}
          subtitle={`${taxaConversao}% taxa de conversão`}
          icon={UserCheck}
          variant="success"
        />
        <StatsCard
          title="Aguardando Resposta"
          value={aguardando}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Eventos Agendados"
          value={comEvento}
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <LeadsTableDB />
        </div>

        {/* Right Sidebar - Activity & Events */}
        <div className="space-y-6">
          <RecentActivityDB />
          <UpcomingEventsDB />
        </div>
      </div>

      <LeadModal open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen} />
    </>
  );
};

export default Dashboard;
