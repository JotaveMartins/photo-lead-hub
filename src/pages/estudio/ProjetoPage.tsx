import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Images, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PhotoGallery from "@/components/studio/PhotoGallery";
import UploadArea from "@/components/studio/UploadArea";
import CarouselEditor from "@/components/studio/CarouselEditor";
import {
  useCarousel,
  useDeletePhoto,
  useProject,
  useProjectPhotos,
  useSaveCarousel,
  useUpdateProjectStatus,
  useUploadPhotos,
  ProjectStatus,
} from "@/hooks/useStudio";
import { aiJsonToSlides, buildDemoCarousel, EditorSlide } from "@/lib/carouselSchema";

const ProjetoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useProject(id);
  const { data: photos = [] } = useProjectPhotos(id);
  const { data: carousel } = useCarousel(id);

  const uploadPhotos = useUploadPhotos(id);
  const deletePhoto = useDeletePhoto(id);
  const saveCarousel = useSaveCarousel(id);
  const updateStatus = useUpdateProjectStatus();

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [slides, setSlides] = useState<EditorSlide[] | null>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (carousel && slides === null) {
      setSlides(carousel.slides);
      setCaption(carousel.legenda ?? "");
    }
  }, [carousel, slides]);

  const nextOrder = useMemo(
    () => photos.reduce((max, p) => Math.max(max, p.upload_order + 1), 0),
    [photos],
  );

  const handleGenerate = () => {
    if (!project) return;
    if (photos.length < 1) return toast.error("Envie fotografias primeiro");
    const json = buildDemoCarousel(photos.map((p) => p.id), project);
    setSlides(aiJsonToSlides(json));
    setCaption(json.carousel.caption);
    toast.success("Carrossel de demonstração gerado — revise e salve.");
  };

  const persist = async (status: string, projectStatus: ProjectStatus) => {
    if (!slides) return;
    try {
      await saveCarousel.mutateAsync({
        carouselId: carousel?.id,
        titulo: project?.nome ?? null,
        legenda: caption,
        status,
        slides,
      });
      await updateStatus.mutateAsync({ id: id!, status: projectStatus });
      toast.success(projectStatus === "Aprovado" ? "Conteúdo aprovado!" : "Carrossel salvo");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar carrossel");
    }
  };

  if (isLoading || !project) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <button
        onClick={() => navigate("/estudio")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Projetos
      </button>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {project.tipo_ensaio}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            {project.nome}
          </h1>
          {project.descricao && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {project.descricao}
            </p>
          )}
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Images className="h-3.5 w-3.5" /> {photos.length} fotografias · {project.status}
          </p>
        </div>
        <Button onClick={handleGenerate}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Gerar Carrossel com IA
        </Button>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Galeria</h2>
        <UploadArea
          compact
          uploading={uploadPhotos.isPending}
          progress={progress}
          onFiles={(files) =>
            uploadPhotos.mutate(
              {
                files,
                startOrder: nextOrder,
                onProgress: (done, total) => setProgress({ done, total }),
              } as any,
              {
                onSuccess: () => {
                  setProgress(null);
                  toast.success("Fotografias enviadas");
                },
                onError: (e: any) => toast.error(e?.message ?? "Erro no upload"),
              },
            )
          }
        />
        <PhotoGallery
          photos={photos}
          onDelete={(photo) =>
            deletePhoto.mutate(photo, {
              onSuccess: () => toast.success("Foto excluída"),
            })
          }
        />
      </section>

      {slides && slides.length > 0 && (
        <section className="border-t border-border/50 pt-8">
          <CarouselEditor
            slides={slides}
            caption={caption}
            photos={photos}
            status={project.status}
            saving={saveCarousel.isPending}
            onChangeSlides={setSlides}
            onChangeCaption={setCaption}
            onSave={() => persist("Em edição", "Em edição")}
            onRegenerate={handleGenerate}
            onApprove={() => persist("Aprovado", "Aprovado")}
          />
        </section>
      )}
    </div>
  );
};

export default ProjetoPage;