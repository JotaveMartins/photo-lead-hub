import { useReviewLocale } from "@/i18n/ReviewLocale";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Images, Instagram, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PhotoGallery from "@/components/studio/PhotoGallery";
import UploadArea from "@/components/studio/UploadArea";
import CarouselEditor from "@/components/studio/CarouselEditor";
import ScheduleModal, { ScheduleMode } from "@/components/studio/ScheduleModal";
import PostPreviewModal from "@/components/studio/PostPreviewModal";
import PublishedInstagramPost, { type PublishedInstagramResult } from "@/components/studio/PublishedInstagramPost";
import InstagramAccountSelect from "@/components/studio/InstagramAccountSelect";
import { canPublishToInstagram, selectedInstagramAccount } from "@/lib/instagramAccounts";
import { format } from "date-fns";
import {
  useCarousel,
  useDeletePhoto,
  useProject,
  useProjectPhotos,
  useSaveCarousel,
  useUpdateProjectStatus,
  useUploadPhotos,
  ProjectStatus,
  MAX_PHOTOS_PER_PROJECT,
} from "@/hooks/useStudio";
import {
  aiJsonToSlides,
  buildDemoCarousel,
  EditorSlide,
  MAX_SLIDES,
} from "@/lib/carouselSchema";
import { exportCarousel } from "@/lib/carouselExport";
import { renderCarouselToStorage } from "@/lib/renderCarouselToStorage";
import {
  useCarouselScheduledPost,
  useScheduledPosts,
  useInstagramAccounts,
  usePublishPost,
  useSchedulePost,
} from "@/hooks/useSocial";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useGenerateCaption } from "@/hooks/useCaptionAi";

const statusStyles: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  "Em edição": "bg-amber-500/15 text-amber-500",
  Gerado: "bg-sky-500/15 text-sky-400",
  Aprovado: "bg-emerald-500/15 text-emerald-400",
};

const ProjetoPage = () => {
  const { t, dateLocale } = useReviewLocale();
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
  const [carouselId, setCarouselId] = useState<string | undefined>();
  const [justSaved, setJustSaved] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string>("Salvando...");
  const [editingAgain, setEditingAgain] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [captionEdited, setCaptionEdited] = useState(false);
  const [slideCount, setSlideCount] = useState(7);
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const savedSnapshot = useRef<string>("");

  const userId = useEffectiveUserId();
  const { data: scheduledPosts = [] } = useScheduledPosts();
  const [publication, setPublication] = useState<{ userId: string; projectId: string; post: PublishedInstagramResult } | null>(null);
  const recordedPublication = scheduledPosts.filter(post => post.projectId === id && post.status === "publicado")
    .sort((a, b) => Date.parse(b.published_at ?? b.scheduled_at) - Date.parse(a.published_at ?? a.scheduled_at))[0];
  const confirmedPublication = publication?.userId === userId && publication.projectId === id ? publication.post : recordedPublication;
  const { data: instagramAccounts = [], isLoading: accountsLoading, isError: accountsError } = useInstagramAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const instagram = selectedInstagramAccount(instagramAccounts, selectedAccountId);
  const schedulePost = useSchedulePost();
  const publishPost = usePublishPost();
  const activePost = useCarouselScheduledPost(carouselId ?? carousel?.id);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState<string | null>(null);
  const generateCaption = useGenerateCaption();

  useEffect(() => {
    if (carousel && slides === null) {
      setSlides(carousel.slides);
      setCaption(carousel.legenda ?? "");
      setCarouselId(carousel.id);
      savedSnapshot.current = JSON.stringify({
        s: carousel.slides.map((s) => [s.layout, s.photoIds, s.focus ?? []]),
        c: carousel.legenda ?? "",
      });
    }
  }, [carousel, slides]);

  const currentSnapshot = JSON.stringify({
    s: (slides ?? []).map((s) => [s.layout, s.photoIds, s.focus ?? []]),
    c: caption,
  });
  const dirty = !!slides && currentSnapshot !== savedSnapshot.current;

  const readOnly = project?.status === "Aprovado" && !editingAgain;

  const nextOrder = useMemo(
    () => photos.reduce((max, p) => Math.max(max, p.upload_order + 1), 0),
    [photos],
  );

  /** Regenera SOMENTE o carrossel. A legenda existente permanece intacta. */
  const handleGenerate = async () => {
    if (!project) return;
    if (photos.length < 1) return toast.error(t("Envie fotografias primeiro"));
    const json = buildDemoCarousel(
      photos.map((p) => ({
        id: p.id,
        shape: (p.orientation as "landscape" | "portrait" | "square") ?? "portrait",
      })),
      project,
      { slideCount, photoCount: photoCount ?? photos.length },
    );
    const newSlides = aiJsonToSlides(json);
    setSlides(newSlides);
    setJustSaved(false);
    if (newSlides.length < slideCount) {
      toast.warning(
        t("Montamos {0} slide(s). As fotografias disponíveis não permitiram chegar a {1}.", [newSlides.length, slideCount]),
      );
    }
    if (!caption.trim()) {
      toast.success(t("Carrossel gerado. Criando legenda com IA..."));
      await runCaptionGeneration(newSlides);
    } else {
      toast.success(t("Carrossel regenerado. A legenda foi mantida."));
    }
  };

  const persist = async (status: string, projectStatus: ProjectStatus) => {
    if (!slides) return;
    setSavingLabel(projectStatus === "Aprovado" ? t("Aprovando...") : t("Salvando..."));
    try {
      const savedId = await saveCarousel.mutateAsync({
        carouselId: carouselId ?? carousel?.id,
        titulo: project?.nome ?? null,
        legenda: caption,
        status,
        slides,
      });
      setCarouselId(savedId);
      await updateStatus.mutateAsync({ id: id!, status: projectStatus });
      savedSnapshot.current = currentSnapshot;
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      if (projectStatus === "Aprovado") setEditingAgain(false);
      toast.success(projectStatus === "Aprovado" ? t("Conteúdo aprovado!") : t("Carrossel salvo"));
    } catch (err: any) {
      toast.error(err?.message ?? t("Erro ao salvar carrossel"));
    }
  };

  const handleDownload = async () => {
    if (!slides?.length) return;
    const urlById: Record<string, string> = {};
    photos.forEach((p) => (urlById[p.id] = p.url));
    setExporting(t("Gerando..."));
    try {
      const total = await exportCarousel(
        slides,
        urlById,
        project?.nome ?? "carrossel",
        (done, totalSlides) => setExporting(t("Gerando {0}/{1}...", [done, totalSlides])),
      );
      toast.success(t("{0} imagem(ns) prontas para download", [total]));
    } catch (err: any) {
      toast.error(err?.message ?? t("Erro ao gerar as imagens"));
    } finally {
      setExporting(null);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success(t("Legenda copiada"));
    } catch {
      toast.error(t("Não foi possível copiar a legenda"));
    }
  };

  const runCaptionGeneration = async (target?: EditorSlide[] | null) => {
    const source = target ?? slides;
    if (!project || !source?.length) return;
    const photoIds = source.flatMap((s) => s.photoIds).filter(Boolean);
    if (!photoIds.length) return toast.error(t("Adicione fotografias aos slides primeiro"));
    try {
      const res = await generateCaption.mutateAsync({
        projectId: project.id,
        photoIds,
        projectContext: {
          event_type: project.tipo_ensaio ?? "",
          people_names: "",
          location: "",
          story: project.descricao ?? "",
          additional_information: project.nome ?? "",
        },
      });
      setCaption(res.caption);
      setCaptionEdited(false);
      setJustSaved(false);
      toast.success(t("Legenda gerada ({0})", [res.analysis?.category ?? t("análise concluída")]));
    } catch (err: any) {
      toast.error(err?.message ?? t("Não foi possível gerar a legenda"));
    }
  };

  const handleGenerateCaption = () => runCaptionGeneration();

  const handleSchedule = async (mode: ScheduleMode, scheduledAtISO: string | null, accountId: string) => {
    const cid = carouselId ?? carousel?.id;
    if (!cid || !slides?.length) return toast.error(t("Salve o carrossel antes de publicar"));
    const account = instagramAccounts.find((item) => item.id === accountId);
    if (accountsError || !account || !canPublishToInstagram(account)) return toast.error(t("Escolha um perfil conectado do Instagram"));
    if (!userId) return;

    setPublishBusy(mode === "now" ? "publicando" : "agendando");
    try {
      const urlById: Record<string, string> = {};
      photos.forEach((p) => (urlById[p.id] = p.url));
      await renderCarouselToStorage(slides, urlById, userId, cid, (done, total) =>
        setPublishBusy(mode === "now" ? "publicando" : "agendando"),
      );

      const when = mode === "now" ? new Date().toISOString() : scheduledAtISO!;
      const postId = await schedulePost.mutateAsync({
        carouselId: cid,
        socialAccountId: account.id,
        scheduledAt: when,
      });

      if (mode === "now") {
        const response = await publishPost.mutateAsync(postId);
        if (typeof response?.media_id !== "string" || !response.media_id)
          throw new Error(t("A publicação não retornou confirmação do Instagram."));
        setPublication({ userId, projectId: id!, post: { status: "publicado", instagram_media_id: response.media_id,
          instagram_permalink: response.permalink ?? null, accountUsername: account.username } });
        toast.success(t("Publicação realizada com sucesso em @{0}", [account.username ?? account.instagram_user_id]));
      } else {
        toast.success(
          t("Publicação agendada para {0}", [format(new Date(when), t("dd/MM 'às' HH:mm"), { locale: dateLocale })]),
        );
      }
      setScheduleOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? t("Não foi possível publicar"));
    } finally {
      setPublishBusy(null);
    }
  };

  if (isLoading || !project) {
    return <p className="py-20 text-center text-sm text-muted-foreground">{t("Carregando...")}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <button
        onClick={() => navigate("/estudio")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Projetos")}</button>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t(project.tipo_ensaio)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            {project.nome}
          </h1>
          {project.descricao && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {project.descricao}
            </p>
          )}
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Images className="h-3.5 w-3.5" /> {photos.length} {t("fotografias")}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                statusStyles[project.status] ?? statusStyles.Rascunho
              }`}
            >
              {t(project.status)}
            </span>
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleGenerate}>
            <Sparkles className="mr-1.5 h-4 w-4" /> {t("Gerar Carrossel com IA")}</Button>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">{t("Galeria")}</h2>
        <UploadArea
          compact
          photoCount={photos.length}
          maxPhotos={MAX_PHOTOS_PER_PROJECT}
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
                onSuccess: (res: any) => {
                  setProgress(null);
                  if (res?.skipped > 0) {
                    toast.warning(
                      t("Você selecionou {0} fotos. Utilizamos {1}, respeitando o limite de {2} por projeto.", [res.selected, res.uploaded, MAX_PHOTOS_PER_PROJECT]),
                    );
                  } else {
                    toast.success(t("Fotografias enviadas"));
                  }
                },
                onError: (e: any) => toast.error(e?.message ?? t("Erro no upload")),
              },
            )
          }
        />
        <PhotoGallery
          photos={photos}
          onDelete={(photo) =>
            deletePhoto.mutate(photo, {
              onSuccess: () => toast.success(t("Foto excluída")),
            })
          }
        />
      </section>

      {slides && slides.length > 0 && (
        <section className="border-t border-border/50 pt-8">
          <div className="mb-5 max-w-md">
            <InstagramAccountSelect
              accounts={instagramAccounts}
              value={instagram?.id ?? ""}
              onChange={setSelectedAccountId}
              disabled={!!publishBusy}
              loading={accountsLoading}
              error={accountsError}
            />
          </div>
          {readOnly && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2.5">
                <Instagram className="h-4 w-4 text-pink-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activePost
                      ? t("Agendado para {0}", [format(new Date(activePost.scheduled_at), t("dd/MM 'às' HH:mm"), { locale: dateLocale })])
                      : t("Publicar no Instagram")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activePost
                      ? t("Perfil agendado: {0}", [activePost.accountUsername ? `@${activePost.accountUsername}` : t("Perfil desconectado")])
                      : instagram?.username
                      ? t("Conta conectada: @{0}", [instagram.username])
                      : instagramAccounts.length
                        ? t("Escolha o perfil acima ou ao agendar")
                        : t("Conecte sua conta em Configurações → Integrações")}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setScheduleOpen(true)} disabled={!!publishBusy}>
                <CalendarClock className="mr-1.5 h-4 w-4" />
                {activePost ? t("Reagendar / publicar") : t("Agendar publicação")}
              </Button>
            </div>
          )}
          <CarouselEditor
            slides={slides}
            caption={caption}
            photos={photos}
            status={project.status}
            saving={saveCarousel.isPending}
            savingLabel={savingLabel}
            dirty={dirty}
            justSaved={justSaved}
            readOnly={readOnly}
            exporting={exporting}
            onChangeSlides={setSlides}
            onChangeCaption={(c) => {
              setCaption(c);
              setCaptionEdited(true);
            }}
            onSave={() => persist("Em edição", "Em edição")}
            onRegenerate={handleGenerate}
            onApprove={() => persist("Aprovado", "Aprovado")}
            onDownload={handleDownload}
            onCopyCaption={handleCopyCaption}
            onEditAgain={() => setEditingAgain(true)}
            onGenerateCaption={handleGenerateCaption}
            generatingCaption={generateCaption.isPending}
            captionEdited={captionEdited}
            onPreviewPost={() => setPreviewOpen(true)}
            slideCount={slideCount}
            photoCount={photoCount ?? photos.length}
            maxPhotos={photos.length}
            onChangeSlideCount={(v) => setSlideCount(Math.min(MAX_SLIDES, v))}
            onChangePhotoCount={setPhotoCount}
          />
        </section>
      )}

      <PostPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        slides={slides ?? []}
        caption={caption}
        photos={photos}
        account={instagram}
      />

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        accounts={instagramAccounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        accountsLoading={accountsLoading}
        accountsError={accountsError}
        slideCount={slides?.length ?? 0}
        caption={caption}
        imageUrls={(slides ?? [])
          .map((s) => {
            const ph = photos.find((p) => p.id === s.photoIds?.[0]);
            return ph ? (ph.thumbUrl ?? ph.url) : null;
          })
          .filter(Boolean) as string[]}
        busyLabel={publishBusy}
        onConfirm={handleSchedule}
      />
    </div>
  );
};

export default ProjetoPage;
