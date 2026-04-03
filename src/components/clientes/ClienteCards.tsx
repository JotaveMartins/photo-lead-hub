import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import type { Cliente } from "@/hooks/useClientes";

interface ClienteCardsProps {
  clientes: Cliente[];
}

const ClienteCards = ({ clientes }: ClienteCardsProps) => {
  const total = clientes.length;
  const now = new Date();
  const thisMonth = clientes.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
            <p className="text-2xl font-bold text-foreground">{total}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="p-3 rounded-lg bg-green-500/10">
            <UserPlus className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Novos este Mês</p>
            <p className="text-2xl font-bold text-foreground">{thisMonth}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteCards;
