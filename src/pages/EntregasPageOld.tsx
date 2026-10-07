import { selectionFunnelLabel } from "@/lib/gallerySelection";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { ListSkeleton, ColumnsSkeleton } from "@/components/ui/list-skeleton";
import { useNavigate } from "react-router-dom";
import { Plus, Camera, CalendarDays, AlertTriangle, Package, Images, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import EntregaDrawer from "@/components/entregas/EntregaDrawer";
import GenericTrashBin from "@/components/GenericTrashBin";
import { PageHeader } from "@/components/ui/page-header";
import { useEntregas, useDeletedEntregas, useRestoreEntrega, useUpdateEntrega, type Entrega } from "@/hooks/useEntregas";
import { useDeliveryStages } from "@/hooks/useDeliveryStages";
import { deliveryStageColorClass, isDeliveredStage, type DeliveryStage } from "@/lib/deliveryStages";
import DeliveryStagesSheet from "@/components/entregas/DeliveryStagesSheet";
import { useEntregaCovers, useCreateGallery } from "@/hooks/useGalleries";
import { parseLocalDate } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";

const fmtDate = (d: string | null) => (d ? format(parseLocalDate(d), "dd/MM/yyyy") : null);

const EntregasPage = () => {
  const { data: entregas = [], isLoading, isError, refetch } = useEntregas();
  const { data: covers = {} } = useEntregaCovers();
  const createGallery = useCreateGallery();
  const updateEntrega = useUpdateEntrega();
  const { data: deletedEntregas = [] } = useDeletedEntregas();
  const restoreEntrega = useRestoreEntrega();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Entrega | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [stagesOpen, setStagesOpen] = useState(false);
  const { data: stages = [], isLoading: stagesLoading, isError: stagesError, refetch: refetchStages } = useDeliveryStages();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entregas;
    return entregas.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        (e.clientes?.nome || "").toLowerCase().includes(q)
    );
  }, [entregas, search]);

  const handleDrop = async (stage: DeliveryStage, id: string) => {
    setDragOver(null);
    const entrega = entregas.find((e) => e.id === id);
    if (!entrega || entrega.stage_id === stage.id) return;
    const updates: any = { id, stage_id: stage.id };
    if (isDeliveredStage(stage) && !entrega.data_entrega_final) {
      updates.data_entrega_final = format(new Date(), "yyyy-MM-dd");
    }
    await updateEntrega.mutateAsync(updates);
    toast.success(`Movido para "${stage.name}"`);
  };

  const openNew = () => { setSelected(null); setDrawerOpen(true); };

  const openEdit = (e: Entrega) => { setSelected(e); setDrawerOpen(true); };

  /** Botão "Fotos": abre a galeria da entrega (cria só quando o usuário pede). */
  const openFotos = async (e: Entrega) => {
    const existing = covers[e.id]?.galleryId;
    if (existing) { navigate(`/galerias/${existing}`); return; }
    setOpening(e.id);
    try {
      const gallery = await createGallery.mutateAsync({
        name: e.titulo,
        cliente_id: e.cliente_id,
        lead_id: e.lead_id,
        entrega_id: e.id,
        event_date: e.data_ensaio,
        expires_in_days: 0,
        download_enabled: true,
      });
      navigate(`/galerias/${gallery.id}`);
    } finally {
      setOpening(null);
    }
  };

  const today = startOfDay(new Date());


  return (
    <div className="space-y-5">
      <PageHeader
        title="Funil de Entregas"
        description="Acompanhe o pós-venda: do ensaio à entrega final"
        secondaryActions={
          <>
          <Button variant="outline" onClick={() => setStagesOpen(true)} className="gap-2">
            <Settings2 className="w-4 h-4" /> Configurar etapas
          </Button>
          <GenericTrashBin
            title="Entregas arquivadas"
            entityName="entrega"
            items={deletedEntregas.map((d) => ({ id: d.id, label: d.titulo, sublabel: d.clientes?.nome || undefined, deleted_at: d.deleted_at as string }))}
            onRestore={(id) => restoreEntrega.mutate(id)}
            isRestoring={restoreEntrega.isPending}
          />
          </>
        }
        action={
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova entrega</Button>
        }
      />
      <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar entrega ou cliente..."
            containerClassName="w-full sm:w-64"
          />
      </div>

      {isLoading || stagesLoading ? (
        <ColumnsSkeleton columns={4} />
      ) : isError ? (
        <ErrorState title="Não foi possível carregar as entregas" onRetry={() => refetch()} />
      ) : stagesError || stages.length === 0 ? (
        <ErrorState title="Não foi possível carregar as etapas do funil" onRetry={() => refetchStages()} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 xl:overflow-visible">
          {stages.map((col) => {
            const items = filtered.filter((e) => e.stage_id === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(ev) => { ev.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
                onDrop={(ev) => handleDrop(col, ev.dataTransfer.getData("text/plain"))}
                className={`flex-shrink-0 w-72 xl:flex-1 xl:w-auto xl:min-w-0 bg-card border rounded-xl flex flex-col transition-colors ${
                  dragOver === col.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${deliveryStageColorClass(col.color_key)}`} />
                    <span className="text-sm font-semibold text-foreground truncate">{col.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                </div>

                <div className="p-2 space-y-2 min-h-[120px]">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-6">Nenhuma entrega</p>
                  )}
                  {items.map((e) => {
                    const prevista = e.data_entrega_prevista ? parseLocalDate(e.data_entrega_prevista) : null;
                    const entregaStage = stages.find((s) => s.id === e.stage_id);
                    const atrasada = !!prevista && !entregaStage?.stage_role.includes("delivered") && isBefore(prevista, today);
                    const info = covers[e.id];
                    return (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
                        onClick={() => openEdit(e)}
                        className="relative w-full text-left bg-muted/40 hover:bg-muted/70 border border-border/60 rounded-lg overflow-hidden transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="relative aspect-[16/9] w-full bg-muted/60">
                          {info?.coverUrl ? (
                            <img
                              src={info.coverUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Images className="h-5 w-5 text-muted-foreground/60" />
                            </div>
                          )}
                          {!!info?.mediaCount && (
                            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-foreground">
                              {info.mediaCount} fotos
                            </span>
                          )}
                        </div>


                        <div className="p-2.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {e.titulo}
                          </p>
                          {e.clientes?.nome && (
                            <p className="text-xs text-muted-foreground truncate">{e.clientes.nome}</p>
                          )}
                          {e.services?.nome && (
                            <p className="text-[11px] text-muted-foreground/80 truncate">{e.services.nome}</p>
                          )}
                          {info?.galleryType === "selection" && (
                            <p className={`mt-1 truncate text-[11px] ${info.selectionFinalizedAt ? "text-status-success" : info.selectionCount ? "text-status-warning" : "text-muted-foreground"}`}>
                              {selectionFunnelLabel(info.selectionFinalizedAt, info.selectionCount, info.selectionLimit)}
                            </p>
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full h-9 gap-1 text-xs"
                            disabled={opening === e.id}
                            onClick={(ev) => { ev.stopPropagation(); openFotos(e); }}
                          >
                            <Images className="w-3.5 h-3.5" />
                            {opening === e.id ? "Abrindo..." : info?.galleryId ? "Fotos" : "Criar espaço de fotos"}
                          </Button>
                        </div>
                      </div>
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
      <DeliveryStagesSheet open={stagesOpen} onClose={() => setStagesOpen(false)} />
    </div>
  );
};

export default EntregasPage;