import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadsTableDB from "@/components/LeadsTableDB";
import LeadModal from "@/components/LeadModal";
import { useLeads } from "@/hooks/useLeads";

const LeadsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: leads = [] } = useLeads();

  return (
    <>
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} leads cadastrados
          </p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </Button>
      </header>

      <LeadsTableDB />

      <LeadModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};

export default LeadsPage;
