import { useState } from "react";
import { Bell, Plus, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useAllPendingTasks, useCompleteLeadTask } from "@/hooks/useLeadTasks";
import { Checkbox } from "@/components/ui/checkbox";
import { isToday, isBefore, parseISO, startOfDay } from "date-fns";

interface DashboardHeaderProps {
  onNewLead?: () => void;
}

const DashboardHeader = ({ onNewLead }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const { data: pendingTasks = [] } = useAllPendingTasks();
  const completeTask = useCompleteLeadTask();

  const today = startOfDay(new Date());
  const urgentTasks = pendingTasks.filter(t => {
    const d = parseISO(t.due_date);
    return isToday(d) || isBefore(d, today);
  });

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Olá, bem-vindo! 👋
        </h1>
        <p className="text-muted-foreground mt-1 capitalize">{currentDate}</p>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 bg-card border-border" />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {urgentTasks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                  {urgentTasks.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              <p className="text-xs text-muted-foreground">{urgentTasks.length} tarefas pendentes para hoje</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {urgentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa urgente 🎉</p>
              ) : (
                urgentTasks.map((task) => {
                  const isOverdue = isBefore(parseISO(task.due_date), today);
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => completeTask.mutate(task)}
                        disabled={completeTask.isPending}
                        className="border-primary data-[state=checked]:bg-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {task.leads?.nome}
                          {isOverdue && <span className="text-destructive ml-1">• Atrasada</span>}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <Button 
          onClick={onNewLead}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Lead</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
