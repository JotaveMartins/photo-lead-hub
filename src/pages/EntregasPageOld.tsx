import { useMemo, useState } from "react";
import { Plus, Camera, CalendarDays, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import EntregaDrawer from "@/components/entregas/EntregaDrawer";
import { ENTREGA_ETAPAS, useEntregas, useUpdateEntrega, type Entrega, type EntregaEtapa } from "@/hooks/useEntregas";
import { parseLocalDate } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";

const fmtDate = (d: string | null) => (d ? format(parseLocalDate(d), "dd/MM/yyyy") : null);

const EntregasPage = () => {
  const { data: entregas = [], isLoading } = useEntregas();
  const updateEntrega = useUpdateEntrega();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Entrega | null>(null);
  const [dragOver, setDragOver] = useState<EntregaEtapa | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entregas;
    return entregas.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        (e.clientes?.nome || "").toLowerCase().includes(q)
    );
  }, [entregas, search]);

  const handleDrop = async (etapa: EntregaEtapa, id: string) => {
    setDragOver(null);
    const entrega = entregas.find((e) => e.id === id);
    if (!entrega || entrega.etapa === etapa) return;
    const updates: any = { id, etapa };
    if (etapa === "Entregue" && !entrega.data_entrega_final) {
      updates.data_entrega_final = format(new Date(), "yyyy-MM-dd");
    }
    await updateEntrega.mutateAsync(updates);
    toast.success(`Movido para "${etapa}"`);
  };

  const openNew = () => { setSelected(null); setDrawerOpen(true); };
  const openEntrega = (e: Entrega) => { setSelected(e); setDrawerOpen(true); };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Funil de Entregas
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhe o pós-venda: do ensaio à entrega final</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar entrega ou cliente..."
            containerClassName="w-full sm:w-64"
          />
          <Button className="bg-gradient-primary hover:opacity-90 gap-2 shrink-0" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova entrega
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando entregas...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 xl:overflow-visible">
          {ENTREGA_ETAPAS.map((col) => {
            const items = filtered.filter((e) => e.etapa === col.etapa);
            return (
              <div
                key={col.etapa}
                onDragOver={(ev) => { ev.preventDefault(); setDragOver(col.etapa); }}
                onDragLeave={() => setDragOver((c) => (c === col.etapa ? null : c))}
                onDrop={(ev) => handleDrop(col.etapa, ev.dataTransfer.getData("text/plain"))}
                className={`flex-shrink-0 w-72 xl:flex-1 xl:w-auto xl:min-w-0 bg-card border rounded-xl flex flex-col transition-colors ${
                  dragOver === col.etapa ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-sm font-semibold text-foreground truncate">{col.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                </div>

                <div className="p-2 space-y-2 min-h-[120px]">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-6">Nenhuma entrega</p>
                  )}
                  {items.map((e) => {
                    const prevista = e.data_entrega_prevista ? parseLocalDate(e.data_entrega_prevista) : null;
                    const atrasada = !!prevista && e.etapa !== "Entregue" && isBefore(prevista, today);
                    return (
                      <button
                        key={e.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
                        onClick={() => openEntrega(e)}
                        className="w-full text-left bg-muted/40 hover:bg-muted/70 border border-border/60 rounded-lg p-2.5 transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{e.titulo}</p>
                        {e.clientes?.nome && (
                          <p className="text-xs text-muted-foreground truncate">{e.clientes.nome}</p>
                        )}
                        {e.services?.nome && (
                          <p className="text-[11px] text-muted-foreground/80 truncate">{e.services.nome}</p>
                        )}
                        <div className="flex flex-col gap-1 mt-2">
                          {e.data_ensaio && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Ensaio {fmtDate(e.data_ensaio)}
                            </span>
                          )}
                          {e.data_entrega_prevista && (
                            <span className={`text-[11px] flex items-center gap-1 ${atrasada ? "text-status-danger" : "text-muted-foreground"}`}>
                              {atrasada ? <AlertTriangle className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                              Entrega {fmtDate(e.data_entrega_prevista)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EntregaDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        entrega={selected}
      />
    </div>
  );
};

export default EntregasPage;