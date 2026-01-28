import { Bell, Plus, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  onNewLead?: () => void;
}

const DashboardHeader = ({ onNewLead }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  
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
          <Input
            placeholder="Buscar..."
            className="pl-9 bg-card border-border"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
        
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
