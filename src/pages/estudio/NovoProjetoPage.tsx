import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SearchSelect from "@/components/SearchSelect";
import UploadArea from "@/components/studio/UploadArea";
import {
  MAX_PHOTOS_PER_PROJECT,
  TIPOS_ENSAIO,
  useCreateProject,
  useDeletePhoto,
  useDeleteProject,
  useProjectPhotos,
  useSaveCarousel,
  useUpdateProject,
  useUploadPhotos,
} from "@/hooks/useStudio";
import { aiJsonToSlides, buildDemoCarousel } from "@/lib/carouselSchema";
import { useGenerateCaption } from "@/hooks/useCaptionAi";

const GENERATION_STEPS = [
  "Analisando fotografias",
  "Montando carrossel",
  "Criando legenda",
  "Finalizando projeto",
];

const NovoProjetoPage = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Casamento");
  const [descricao, setDescricao] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const creatingDraft = useRef<Promise<string> | null>(null);

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const uploadPhotos = useUploadPhotos(draftId);
  const deletePhoto = useDeletePhoto(draftId);
  const saveCarousel = useSaveCarousel(draftId);
  const generateCaption = useGenerateCaption();
  const { data: photos = [] } = useProjectPhotos(draftId);

  const submitting = step !== null;

  /** Cria (uma única vez) o projeto rascunho que recebe os uploads imediatos. */
  const ensureDraft = async (): Promise<string> => {
    if (draftId) return draftId;
    if (!creatingDraft.current) {
      creatingDraft.current = createProject
        .mutateAsync({
          nome: nome.trim() || "Novo projeto",
          tipo_ensaio: tipo,
          descricao: descricao.trim(),
        })
        .then((p) => {
          setDraftId(p.id);
          return p.id;
        });
    }
    return creatingDraft.current;
  };

  const handleFiles = async (files: File[]) => {
    const already = photos.length;
    const remaining = MAX_PHOTOS_PER_PROJECT - already;
    if (remaining <= 0) {
      return toast.error(`Limite de ${MAX_PHOTOS_PER_PROJECT} fotos por projeto atingido.`);
    }
    setUploading(true);
    try {
      const pid = await ensureDraft();
      const res: any = await uploadPhotos.mutateAsync({
        projectId: pid,
        files,
        startOrder: already,
        onProgress: (done, total) => setProgress({ done, total }),
      } as any);
      if (res?.skipped > 0) {
        if (already === 0) {
          toast.warning(
            `Você selecionou ${res.selected} fotos. Utilizamos as primeiras ${res.uploaded}, que é o limite permitido por projeto.`,
          );
        } else {
          toast.warning(
            `${res.uploaded} nova(s) foto(s) foram adicionadas. O limite máximo de ${MAX_PHOTOS_PER_PROJECT} fotos foi atingido.`,
          );
        }
      } else {
        toast.success(`${res?.uploaded ?? files.length} foto(s) enviadas`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar fotografias");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleCancel = async () => {
    if (draftId) {
      await deleteProject.mutateAsync(draftId).catch(() => undefined);
    }
    navigate("/estudio");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome do projeto");
    if (uploading) return toast.error("Aguarde o envio das fotografias.");
    if (!draftId || photos.length === 0)
      return toast.error("Envie pelo menos uma fotografia");

    try {
      setStep(0);
      await updateProject.mutateAsync({
        id: draftId,
        nome: nome.trim(),
        tipo_ensaio: tipo,
        descricao: descricao.trim(),
      });

      setStep(1);
      const json = buildDemoCarousel(
        photos.map((p) => ({
          id: p.id,
          shape: (p.orientation as "landscape" | "portrait" | "square") ?? "portrait",
        })),
        {
        nome: nome.trim(),
        tipo_ensaio: tipo,
        descricao: descricao.trim(),
        },
      );
      const slides = aiJsonToSlides(json);

      setStep(2);
      let legenda = json.carousel.caption;
      try {
        const res = await generateCaption.mutateAsync({
          projectId: draftId,
          photoIds: slides.flatMap((s) => s.photoIds).filter(Boolean),
          projectContext: {
            event_type: tipo,
            story: descricao.trim(),
            additional_information: nome.trim(),
          },
        });
        if (res?.caption) legenda = res.caption;
      } catch {
        toast.warning("Não foi possível gerar a legenda com IA agora. Você pode regenerá-la no editor.");
      }

      setStep(3);
      await saveCarousel.mutateAsync({
        titulo: nome.trim(),
        legenda,
        status: "Gerado",
        slides,
      });
      await updateProject.mutateAsync({ id: draftId, status: "Gerado" });

      toast.success("Projeto criado!");
      navigate(`/estudio/${draftId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar projeto");
      setStep(null);
    }
  };

  if (submitting) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-foreground">
          Estamos preparando seu conteúdo.
        </h1>
        <ul className="mx-auto mt-6 w-fit space-y-2 text-left text-sm">
          {GENERATION_STEPS.map((label, i) => (
            <li
              key={label}
              className={
                i < (step ?? 0)
                  ? "text-emerald-400"
                  : i === step
                    ? "text-foreground"
                    : "text-muted-foreground/60"
              }
            >
              {i < (step ?? 0) ? "✓" : i === step ? "•" : "·"} {label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/estudio")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-3xl font-semibold text-foreground">Novo projeto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Descreva o ensaio e envie as fotografias.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nome do projeto
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Amanda & Rafael — Pré-Wedding"
            className="bg-muted/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo de ensaio
          </label>
          <SearchSelect
            value={tipo}
            onChange={(v) => setTipo(v)}
            options={TIPOS_ENSAIO.map((t) => ({ value: t, label: t }))}
            placeholder="Selecione o tipo"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contexto do ensaio
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            placeholder="Ensaio pré-wedding de Amanda e Rafael realizado na praia durante o pôr do sol."
            className="bg-muted/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fotografias
          </label>
          <UploadArea
            compact
            photoCount={photos.length}
            maxPhotos={MAX_PHOTOS_PER_PROJECT}
            uploading={uploading}
            progress={progress}
            onFiles={handleFiles}
          />
          <p className="text-xs text-muted-foreground">
            {photos.length} de {MAX_PHOTOS_PER_PROJECT} fotos
            {uploading && progress
              ? ` · Enviando fotos, ${progress.done} de ${progress.total}`
              : ""}
          </p>
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-md border border-border/60"
                >
                  <img
                    src={p.thumbUrl}
                    alt={p.filename ?? "Fotografia"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover fotografia"
                    onClick={() => deletePhoto.mutate(p)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={uploading || photos.length === 0}>
            {uploading ? "Aguarde o envio das fotografias..." : "Criar projeto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovoProjetoPage;