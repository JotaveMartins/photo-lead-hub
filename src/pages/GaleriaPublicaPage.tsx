import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Download, Heart, ImageOff, Lock, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

/**
 * Galeria pública do cliente final. Identidade visual própria (clara e minimalista),
 * independente do tema do CRM. Grade usa miniatura, lightbox usa visualização,
 * original apenas no download autorizado.
 */

interface PublicPhoto {
  id: string;
  section_id: string | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  preview_url: string | null;
}

interface PublicData {
  state: "ok" | "password" | "unavailable" | "expired" | "not_found";
  favorite_media_ids?: string[];
  token?: string | null;
  preview?: boolean;
  gallery?: { name: string; event_date: string | null; download_enabled: boolean; media_count: number; cover_url: string | null };
  photographer?: { nome: string | null; logo: string | null };
  sections?: { id: string; name: string; sort_order: number }[];
  photos?: PublicPhoto[];
  error?: string;
}

const tokenKey = (slug: string) => `gallery-token:${slug}`;

/** Identificação aleatória e persistente do visitante desta galeria (sem login, sem IP). */
const visitorKey = (slug: string) => `gallery-visitor:${slug}`;
const getVisitorId = (slug: string) => {
  let id = localStorage.getItem(visitorKey(slug));
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    localStorage.setItem(visitorKey(slug), id);
  }
  return id;
};

const callPublic = async (payload: Record<string, unknown>): Promise<PublicData> => {
  const { data, error } = await supabase.functions.invoke("gallery-public", { body: payload });
  if (error) {
    try {
      const ctx = (error as any).context;
      const parsed = ctx?.json ? await ctx.json() : null;
      if (parsed) return parsed as PublicData;
    } catch { /* ignora */ }
    throw error;
  }
  return data as PublicData;
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex items-center justify-center px-6 text-center">
    {children}
  </div>
);

const GaleriaPublicaPage = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const isPreview = params.get("preview") === "1";

  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(tokenKey(slug)));
  const [activeSection, setActiveSection] = useState("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  // noindex para galerias de clientes
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gallery-public", slug, token, isPreview],
    enabled: !!slug,
    queryFn: () => callPublic({ action: "get", slug, token }),
  });

  useEffect(() => {
    if (data?.token) {
      sessionStorage.setItem(tokenKey(slug), data.token);
      setToken(data.token);
    }
    if (data?.gallery?.name) document.title = data.gallery.name;
  }, [data, slug]);

  const photos = useMemo(() => {
    const all = data?.photos ?? [];
    return activeSection === "all" ? all : all.filter((p) => p.section_id === activeSection);
  }, [data, activeSection]);

  const close = useCallback(() => setLightbox(null), []);
  const move = useCallback(
    (delta: number) =>
      setLightbox((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, move]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setPwError("");
    try {
      const res = await callPublic({ action: "get", slug, password });
      if (res.state === "password") setPwError(res.error ?? "Senha incorreta.");
      else if (res.token) {
        sessionStorage.setItem(tokenKey(slug), res.token);
        setToken(res.token);
        await refetch();
      }
    } catch {
      setPwError("Senha incorreta.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPhoto = async (mediaId: string) => {
    try {
      const { data: res } = await supabase.functions.invoke("gallery-public", {
        body: { action: "download", slug, mediaId, token },
      });
      const url = (res as any)?.url;
      if (url) window.location.href = url;
    } catch { /* ignora */ }
  };

  if (isLoading) {
    return <Shell><p className="text-sm text-[#78716c] animate-pulse">Carregando...</p></Shell>;
  }
  if (!data || data.state === "not_found" || data.state === "unavailable") {
    return <Shell><p className="text-sm text-[#78716c]">Esta galeria ainda não está disponível.</p></Shell>;
  }
  if (data.state === "expired") {
    return <Shell><p className="text-sm text-[#78716c]">Esta galeria não está mais disponível.</p></Shell>;
  }

  const photographerName = data.photographer?.nome ?? "";

  if (data.state === "password") {
    return (
      <Shell>
        <form onSubmit={submitPassword} className="w-full max-w-sm space-y-5">
          <Lock className="mx-auto h-6 w-6 text-[#a8a29e]" />
          <div className="space-y-1">
            <h1 className="font-display text-2xl">{data.gallery?.name}</h1>
            {photographerName && <p className="text-xs uppercase tracking-[0.2em] text-[#a8a29e]">{photographerName}</p>}
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha de acesso"
            className="w-full rounded-md border border-[#e7e5e4] bg-white px-4 py-3 text-center text-sm outline-none focus:border-[#1c1917]"
          />
          {pwError && <p className="text-xs text-[#b91c1c]">{pwError}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-md bg-[#1c1917] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Verificando..." : "Acessar galeria"}
          </button>
        </form>
      </Shell>
    );
  }

  const g = data.gallery!;
  const sections = data.sections ?? [];
  const eventDate = g.event_date ? format(parseLocalDate(g.event_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
  const current = lightbox !== null ? photos[lightbox] : null;

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917]">
      {data.preview && (
        <div className="bg-[#1c1917] px-4 py-2 text-center text-xs text-white">
          Pré-visualização: esta galeria ainda não foi publicada.
        </div>
      )}

      {/* Capa */}
      {g.cover_url ? (
        <div className="relative h-[68vh] w-full overflow-hidden sm:h-[80vh]">
          <img src={g.cover_url} alt={g.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-center text-white sm:p-14">
            <h1 className="font-display text-3xl font-light tracking-wide sm:text-5xl">{g.name}</h1>
            {photographerName && (
              <p className="mt-3 text-[11px] uppercase tracking-[0.3em] opacity-90">{photographerName}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-20" />
      )}

      {/* Introdução */}
      <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-20">
        {data.photographer?.logo && (
          <img src={data.photographer.logo} alt={photographerName} className="mx-auto mb-6 h-12 w-12 rounded-full object-cover" />
        )}
        <h2 className="font-display text-2xl font-light sm:text-3xl">{g.name}</h2>
        {eventDate && <p className="mt-2 text-sm text-[#78716c]">{eventDate}</p>}
        {photographerName && (
          <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-[#a8a29e]">
            Fotografado por {photographerName}
          </p>
        )}
        {!!g.media_count && <p className="mt-2 text-xs text-[#a8a29e]">{g.media_count} fotografias</p>}
      </div>

      {/* Seções */}
      {sections.length > 0 && (
        <div className="mx-auto mb-8 flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-3 px-6">
          {[{ id: "all", name: "Todas" }, ...sections].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`pb-1 text-xs uppercase tracking-[0.2em] transition-colors ${
                activeSection === s.id
                  ? "border-b border-[#1c1917] text-[#1c1917]"
                  : "border-b border-transparent text-[#a8a29e] hover:text-[#1c1917]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Grade */}
      {photos.length ? (
        <div className="mx-auto max-w-[1600px] px-2 pb-20 sm:px-4">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightbox(i)}
                className="group relative aspect-[4/5] overflow-hidden bg-[#f5f5f4]"
              >
                {p.thumbnail_url && !broken[p.id] ? (
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setBroken((b) => ({ ...b, [p.id]: true }))}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-5 w-5 text-[#d6d3d1]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="pb-24 text-center text-sm text-[#a8a29e]">Esta galeria ainda não possui fotografias.</p>
      )}

      <footer className="border-t border-[#eeece9] py-8 text-center text-[11px] uppercase tracking-[0.25em] text-[#a8a29e]">
        {photographerName || "Galeria"}
      </footer>

      {/* Lightbox */}
      {current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 text-white/80">
            <span className="text-xs">{(lightbox ?? 0) + 1} / {photos.length}</span>
            <div className="flex items-center gap-2">
              {g.download_enabled && (
                <button
                  onClick={() => downloadPhoto(current.id)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs hover:bg-white/20"
                >
                  <Download className="h-4 w-4" /> Baixar
                </button>
              )}
              <button onClick={close} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6">
            <button
              onClick={() => move(-1)}
              aria-label="Anterior"
              className="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {current.preview_url && !broken[`p-${current.id}`] ? (
              <img
                src={current.preview_url}
                alt=""
                onError={() => setBroken((b) => ({ ...b, [`p-${current.id}`]: true }))}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-white/70">Não foi possível carregar esta fotografia.</p>
            )}
            <button
              onClick={() => move(1)}
              aria-label="Próxima"
              className="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GaleriaPublicaPage;
