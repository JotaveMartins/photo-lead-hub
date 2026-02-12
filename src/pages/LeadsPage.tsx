import { useState } from "react";
import { Plus, Users, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadsTableDB from "@/components/LeadsTableDB";
import LeadModal from "@/components/LeadModal";
import KanbanBoard from "@/components/KanbanBoard";
import LeadDetailDrawer from "@/components/LeadDetailDrawer";
import { useLeads } from "@/hooks/useLeads";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const LeadsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { data: leads = [] } = useLeads();

  // Count only active leads (not closed)
  const activeLeads = leads.filter(l => l.status !== "Fechado Ganho" && l.status !== "Fechado Perdido");

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Leads
          </h1>
          <p className="text-muted-foreground mt-1">{activeLeads.length} leads ativos · {leads.length} total</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
        </div>
      </header>

      {viewMode === "kanban" ? (
        <KanbanBoard onLeadClick={setSelectedLead} />
      ) : (
        <LeadsTableDB onLeadClick={setSelectedLead} />
      )}

      <LeadModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
    </>
  );
};

export default LeadsPage;
