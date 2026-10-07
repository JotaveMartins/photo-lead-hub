import { useState } from "react";
import { Users, Calendar, Clock, UserCheck } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import StatsCard from "@/components/StatsCard";
import LeadsTableDB from "@/components/LeadsTableDB";
import RecentActivityDB from "@/components/RecentActivityDB";
import UpcomingEventsDB from "@/components/UpcomingEventsDB";
import LeadModal from "@/components/LeadModal";
import { useLeads } from "@/hooks/useLeads";
import { usePipelineStages } from "@/hooks/usePipelineStages";

const Dashboard = () => {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const { data: leads = [] } = useLeads();
  const { stageById, proposalStage, firstStageAfterLead } = usePipelineStages();

  const totalLeads = leads.length;
  const emNegociacao = leads.filter(l => {
    const stage = stageById(l.stage_id);
    if (!stage || stage.stage_role === "won" || stage.stage_role === "lost") return false;
    if (proposalStage) return stage.position >= proposalStage.position;
    return stage.stage_role === "open" || stage.stage_role === "proposal";
  }).length;
  const aguardando = firstStageAfterLead
    ? leads.filter(l => l.stage_id === firstStageAfterLead.id).length
    : 0;
  const comEvento = leads.filter(l => l.data_evento).length;
  const taxaConversao = totalLeads > 0 ? Math.round((emNegociacao / totalLeads) * 100) : 0;

  return (
    <>
      <DashboardHeader onNewLead={() => setIsLeadModalOpen(true)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total de Leads" value={totalLeads} icon={Users} trend={{ value: 12, isPositive: true }} variant="primary" />
        <StatsCard title="Em Negociação" value={emNegociacao} subtitle={`${taxaConversao}% do total`} icon={UserCheck} variant="success" />
        <StatsCard title={firstStageAfterLead?.name || "Contato Iniciado"} value={aguardando} icon={Clock} variant="warning" />
        <StatsCard title="Eventos Agendados" value={comEvento} icon={Calendar} variant="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><LeadsTableDB /></div>
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
