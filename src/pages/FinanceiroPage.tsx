import { useState } from "react";
import { DollarSign, ChevronLeft, ChevronRight, Search, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CobrancaCards from "@/components/financeiro/CobrancaCards";
import CobrancaTable from "@/components/financeiro/CobrancaTable";
import NovaCobrancaModal from "@/components/financeiro/NovaCobrancaModal";
import EditCobrancaModal from "@/components/financeiro/EditCobrancaModal";
import { useCobrancas, useAllCobrancas } from "@/hooks/useCobrancas";
import type { Cobranca } from "@/hooks/useCobrancas";

type ModalType = "unica" | "parcelas" | "recorrente";

const FinanceiroPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [editCobranca, setEditCobranca] = useState<Cobranca | null>(null);

  const { data: monthCobrancas = [], isLoading } = useCobrancas(showAll ? undefined : currentMonth);
  const { data: allCobrancas = [] } = useAllCobrancas();

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setShowAll(false);
  };
  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setShowAll(false);
  };

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthCount = monthCobrancas.length;

  const openModal = (type: ModalType) => {
    setModalType(type);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cobranças"
        subtitle="Gerencie todas as cobranças dos seus clientes"
        icon={<DollarSign className="w-6 h-6 text-primary" />}
      />

      <CobrancaCards cobrancas={monthCobrancas} allCobrancas={allCobrancas} />

      {/* Controls bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[120px] text-center">{monthLabel}</span>
          {monthCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">{monthCount}</span>
          )}
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="ml-1"
          >
            <Calendar className="w-4 h-4 mr-1" /> Ver tudo
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-9 bg-muted border-border"
            />
          </div>

          <div className="relative">
            <Button
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar cobrança
            </Button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
                  <button
                    onClick={() => openModal("unica")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
                  >
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    Cobrança única
                  </button>
                  <button
                    onClick={() => openModal("parcelas")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
                  >
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Criar parcelas
                  </button>
                  <button
                    onClick={() => openModal("recorrente")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    Cobrança recorrente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <CobrancaTable cobrancas={monthCobrancas} onEdit={setEditCobranca} search={search} />
      )}

      {/* Modals */}
      {modalType && (
        <NovaCobrancaModal open={!!modalType} onOpenChange={(open) => !open && setModalType(null)} type={modalType} />
      )}
      <EditCobrancaModal open={!!editCobranca} onOpenChange={(open) => !open && setEditCobranca(null)} cobranca={editCobranca} />
    </div>
  );
};

export default FinanceiroPage;
