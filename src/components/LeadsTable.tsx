import { useState } from "react";
import { Filter, Phone, MoreHorizontal, Calendar, ChevronDown } from "lucide-react";
import { Lead, leads } from "@/data/leads";
import LeadStatusBadge from "./LeadStatusBadge";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { normalizeText } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LeadsTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const q = normalizeText(searchQuery);
    const matchesSearch = !q ||
      normalizeText(lead.nome).includes(q) ||
      normalizeText(lead.whatsapp).includes(q);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatWhatsApp = (number: string) => {
    return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <SearchInput
            containerClassName="flex-1 max-w-md"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="bg-muted border-border"
          />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Em andamento")}>
                  Em andamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Interessado sem resposta")}>
                  Aguardando resposta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Sem resposta")}>
                  Sem resposta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Sem interesse")}>
                  Perdidos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lead
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Interesse
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Evento
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Follow-ups
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, index) => (
              <tr 
                key={lead.id} 
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{lead.nome}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {formatWhatsApp(lead.whatsapp)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-foreground">
                    {lead.interesse || "—"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-4">
                  {lead.dataEvento ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {lead.dataEvento}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    {[lead.followUp1, lead.followUp2, lead.followUp3].map((fu, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          fu ? 'bg-primary' : 'bg-muted'
                        }`}
                        title={fu || 'Não realizado'}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                      <DropdownMenuItem>Enviar mensagem</DropdownMenuItem>
                      <DropdownMenuItem>Agendar follow-up</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Marcar como perdido
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filteredLeads.length} de {leads.length} leads</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadsTable;
