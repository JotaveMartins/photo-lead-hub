import { useState } from "react";
import { Filter, Phone, MoreHorizontal, Calendar, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useLeads, useDeleteLead, useBulkUpdateLeads } from "@/hooks/useLeads";
import { useInteresseOptions } from "@/hooks/useInteresseOptions";
import { Checkbox } from "@/components/ui/checkbox";
import LeadStatusBadgeDB from "./LeadStatusBadgeDB";
import LeadModal from "./LeadModal";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { normalizeText } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const ORIGEM_OPTIONS = [
  "Instagram", "Facebook", "Google", "Tráfego Pago", "Indicação", "Site", "WhatsApp", "Evento", "Outro",
];

const STATUS_OPTIONS = [
  "Novo Lead", "Contato Iniciado", "Triagem Feita", "Proposta Enviada",
  "Follow-up", "Contrato Enviado", "Fechado Ganho", "Fechado Perdido",
];

interface LeadsTableDBProps {
  onLeadClick?: (lead: Lead) => void;
}

const LeadsTableDB = ({ onLeadClick }: LeadsTableDBProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<"origem" | "interesse" | "status">("origem");
  const [bulkValue, setBulkValue] = useState<string>("");

  const { data: leads = [], isLoading } = useLeads();
  const { data: interesseOptions = [] } = useInteresseOptions();
  const deleteLead = useDeleteLead();
  const bulkUpdate = useBulkUpdateLeads();

  const filteredLeads = leads.filter((lead) => {
    const q = normalizeText(searchQuery);
    const matchesSearch = !q ||
      normalizeText(lead.nome).includes(q) ||
      normalizeText(lead.whatsapp).includes(q);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatWhatsApp = (number: string) => {
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    }
    return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const handleDelete = async () => {
    if (deletingLeadId) {
      await deleteLead.mutateAsync(deletingLeadId);
      setDeletingLeadId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const bulkOptions =
    bulkField === "origem" ? ORIGEM_OPTIONS
    : bulkField === "interesse" ? interesseOptions.map((i: any) => i.label || i.value || i)
    : STATUS_OPTIONS;

  const handleBulkApply = async () => {
    if (!bulkValue || selectedIds.size === 0) return;
    await bulkUpdate.mutateAsync({
      ids: Array.from(selectedIds),
      updates: { [bulkField]: bulkValue } as any,
    });
    setSelectedIds(new Set());
    setBulkValue("");
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="animate-pulse text-muted-foreground">Carregando leads...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
        {selectedIds.size > 0 && (
          <div className="p-3 border-b border-border bg-primary/5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} lead(s) selecionado(s)
            </span>
            <span className="text-xs text-muted-foreground ml-2">Editar campo:</span>
            <select
              value={bulkField}
              onChange={(e) => { setBulkField(e.target.value as any); setBulkValue(""); }}
              className="text-sm bg-background border border-border rounded-md px-2 py-1 text-foreground"
            >
              <option value="origem">Origem</option>
              <option value="interesse">Interesse</option>
              <option value="status">Status</option>
            </select>
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="text-sm bg-background border border-border rounded-md px-2 py-1 text-foreground min-w-[160px]"
            >
              <option value="">Selecione um valor…</option>
              {bulkOptions.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={!bulkValue || bulkUpdate.isPending}
            >
              {bulkUpdate.isPending ? "Aplicando…" : "Aplicar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}

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
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>Todos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Novo Lead")}>Novo Lead</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Contato Iniciado")}>Contato Iniciado</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Proposta Enviada")}>Proposta Enviada</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Follow-up")}>Follow-up</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Contrato Enviado")}>Contrato Enviado</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Fechado Ganho")}>Fechado Ganho</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Fechado Perdido")}>Fechado Perdido</DropdownMenuItem>
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
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </th>
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
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {leads.length === 0 
                      ? "Nenhum lead cadastrado. Clique em 'Novo Lead' para começar!"
                      : "Nenhum lead encontrado com os filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onLeadClick?.(lead)}
                    
                  >
                    <td className="px-3 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        aria-label={`Selecionar ${lead.nome}`}
                      />
                    </td>
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
                      <LeadStatusBadgeDB status={lead.status} />
                    </td>
                    <td className="px-4 py-4">
                      {lead.data_evento ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(lead.data_evento)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {[lead.follow_up_1, lead.follow_up_2, lead.follow_up_3, (lead as any).follow_up_4, (lead as any).follow_up_5].map((fu, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full ${
                              fu ? 'bg-primary' : 'bg-muted'
                            }`}
                            title={fu ? formatDate(fu) || 'Realizado' : 'Não realizado'}
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
                          <DropdownMenuItem onClick={() => setEditingLead(lead)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => window.open(`https://wa.me/55${lead.whatsapp}`, '_blank')}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Enviar mensagem
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingLeadId(lead.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {filteredLeads.length} de {leads.length} leads</span>
        </div>
      </div>

      {/* Edit Modal */}
      <LeadModal 
        open={!!editingLead} 
        onOpenChange={(open) => !open && setEditingLead(null)} 
        lead={editingLead}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLeadId} onOpenChange={(open) => !open && setDeletingLeadId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeadsTableDB;
