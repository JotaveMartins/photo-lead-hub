import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Eye, Send, Settings, Trash2, UploadCloud, Plus, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  useGallery,
  useGallerySections,
  useGalleryMedia,
  useUpdateGallery,
  useDeleteGallery,
  useCreateSection,
  formatBytes,
} from "@/hooks/useGalleries";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  expired: "Expirada",
  archived: "Arquivada",
};

const GaleriaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: gallery, isLoading } = useGallery(id);
  const { data: sections = [] } = useGallerySections(id);
  const { data: media = [] } = useGalleryMedia(id);
  const updateGallery = useUpdateGallery();
  const deleteGallery = useDeleteGallery();
  const createSection = useCreateSection();

  const [activeSection, setActiveSection] = useState<string>("all");
  const [newSection, setNewSection] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return <p className="py-20 text-center text-sm text-muted-foreground animate-pulse">Carregando...</p>;
  }
  if (!gallery) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Galeria não encontrada.</p>;
  }

  const visibleMedia = activeSection === "all" ? media : media.filter((m) => m.section_id === activeSection);

  const handlePublish = () => {
    updateGallery.mutate(
      { id: gallery.id, status: "published", published_at: new Date().toISOString() },
      { onSuccess: () => toast.success("Galeria publicada!") },
    );
  };

  const handleCreateSection = () => {
    if (!newSection.trim()) return;
    createSection.mutate(
      { galleryId: gallery.id, name: newSection.trim(), sortOrder: sections.length },
      {
        onSuccess: () => {
          setNewSection("");
          setAddingSection(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={() => navigate("/entregas")} className="hover:text-foreground">
          Entregas
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{gallery.name}</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{gallery.name}</h1>
            <Badge variant={gallery.status === "published" ? "default" : "secondary"}>
              {STATUS_LABEL[gallery.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {gallery.media_count} fotos · {formatBytes(gallery.storage_bytes)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled title="Disponível após o envio das fotos">
            <Eye className="mr-2 h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button onClick={handlePublish} disabled={gallery.status === "published" || updateGallery.isPending}>
            <Send className="mr-2 h-4 w-4" />
            Publicar
          </Button>
          <Button variant="outline" onClick={() => toast.info("Configurações da galeria em breve.")}>
            <Settings className="mr-2 h-4 w-4" />
            Editar configurações
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Seções */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSection("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeSection === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Todas
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeSection === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.name}
          </button>
        ))}
        {addingSection ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSection()}
              placeholder="Nome da seção"
              className="h-9 w-44"
            />
            <Button size="sm" onClick={handleCreateSection} disabled={createSection.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingSection(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSection(true)}
            className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Nova seção
          </button>
        )}
      </div>

      {/* Upload */}
      <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-14 text-center">
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Arraste suas fotos aqui</p>
        <p className="text-xs text-muted-foreground">JPG, JPEG ou PNG</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled title="Disponível após configurar o armazenamento">
            Selecionar arquivos
          </Button>
          <Button variant="outline" disabled title="Disponível após configurar o armazenamento">
            Selecionar pasta
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          O envio será habilitado assim que o armazenamento de fotos estiver conectado.
        </p>
      </Card>

      {/* Fotos */}
      {visibleMedia.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {visibleMedia.map((m) => (
            <Card key={m.id} className="flex aspect-square items-center justify-center bg-muted/40">
              <span className="px-2 text-center text-[11px] text-muted-foreground line-clamp-2">{m.filename}</span>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Images className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma foto nesta galeria ainda.</p>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir galeria?</AlertDialogTitle>
            <AlertDialogDescription>
              A galeria "{gallery.name}" será removida da sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGallery.mutate(gallery.id, { onSuccess: () => navigate("/entregas") })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GaleriaDetailPage;
