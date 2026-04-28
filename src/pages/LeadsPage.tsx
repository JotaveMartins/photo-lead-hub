import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users, LayoutGrid, List, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadsTableDB from "@/components/LeadsTableDB";
import LeadModal from "@/components/LeadModal";
import KanbanBoard from "@/components/KanbanBoard";
import LeadDetailDrawer from "@/components/LeadDetailDrawer";
import TrashBin from "@/components/TrashBin";
import { useLeads } from "@/hooks/useLeads";
import { useAllPendingTasks, useCompleteLeadTask } from "@/hooks/useLeadTasks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { isToday, isBefore, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const LeadsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: leads = [] } = useLeads();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const completeTask = useCompleteLeadTask();

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && leads.length > 0) {
      const lead = leads.find((l) => l.id === openId);
      if (lead) {
        setSelectedLead(lead);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, leads, setSearchParams]);

  const today = startOfDay(new Date());
  const todayTasks = pendingTasks
    .filter((t) => {
      const d = parseLocalDate(t.due_date);
      return isToday(d) || isBefore(d, today);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const activeLeads = leads.filter((l) => l.status !== "Fechado Ganho" && l.status !== "Fechado Perdido");

  const handleTaskClick = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;

    setNotificationsOpen(false);
    setSelectedLead(lead);
  };

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

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <TrashBin />

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="w-4 h-4" />
                {todayTasks.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {todayTasks.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Tarefas de Hoje</p>
                <p className="text-xs text-muted-foreground">{todayTasks.length} pendentes</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa para hoje 🎉</p>
                ) : (
                  todayTasks.map((task) => {
                    const isOverdue = isBefore(parseLocalDate(task.due_date), today);
                    const dueDateLabel = new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR");

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleTaskClick(task.lead_id)}
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => completeTask.mutate(task)}
                          disabled={completeTask.isPending}
                          className="border-primary data-[state=checked]:bg-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {task.leads?.nome}
                            {isOverdue && <span className="text-destructive ml-1">• Atrasada</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">Vence em {dueDateLabel}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden sm:flex bg-muted rounded-lg p-1">
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
            <span className="hidden sm:inline">Novo Lead</span>
            <span className="sm:hidden">Novo</span>
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

