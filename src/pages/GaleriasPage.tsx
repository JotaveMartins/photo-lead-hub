import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Images, Search, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import NovaGaleriaModal from "@/components/galerias/NovaGaleriaModal";
import { useGalleries, useStorageUsage, formatBytes, GalleryStatus } from "@/hooks/useGalleries";
import { normalizeText, parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_LABEL: Record<GalleryStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  expired: "Expirada",
  archived: "Arquivada",
};

const FILTERS: { key: "all" | GalleryStatus; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Rascunhos" },
  { key: "published", label: "Publicadas" },
  { key: "expired", label: "Expiradas" },
];

const GaleriasPage = () => {
  const navigate = useNavigate();
  const { data: galleries = [], isLoading } = useGalleries();
  const { data: usage } = useStorageUsage();
  const [filter, setFilter] = useState<"all" | GalleryStatus>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return galleries.filter((g) => {
      if (filter !== "all" && g.status !== filter) return false;
      if (!q) return true;
      return (
        normalizeText(g.name).includes(q) || normalizeText(g.clientes?.nome ?? "").includes(q)
      );
    });
  }, [galleries, filter, search]);

  const usedPct = usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Galerias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas galerias de entrega de fotos.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova galeria
        </Button>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-foreground">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="font-medium">Armazenamento utilizado</span>
          <span className="ml-auto text-muted-foreground">
            {formatBytes(usage?.used ?? 0)} de {formatBytes(usage?.limit ?? 0)}
          </span>
        </div>
        <Progress value={usedPct} className="h-2" />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por galeria ou cliente..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground animate-pulse">Carregando...</p>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Images className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma galeria por aqui ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((g) => (
            <Card
              key={g.id}
              onClick={() => navigate(`/galerias/${g.id}`)}
              className="cursor-pointer overflow-hidden transition-colors hover:border-primary/50"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-muted/50">
                <Images className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground line-clamp-1">{g.name}</h3>
                  <Badge variant={g.status === "published" ? "default" : "secondary"}>
                    {STATUS_LABEL[g.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {g.clientes?.nome ?? "Sem cliente vinculado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.event_date ? format(parseLocalDate(g.event_date), "dd/MM/yyyy") : "Sem data"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.media_count} fotos · {formatBytes(g.storage_bytes)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NovaGaleriaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default GaleriasPage;
