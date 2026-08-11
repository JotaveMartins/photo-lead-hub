import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EditorSlide } from "@/lib/carouselSchema";
import { optimizeImageFile } from "@/lib/imageOptimize";

const BUCKET = "project-photos";

export const MAX_PHOTOS_PER_PROJECT = 30;

export type ProjectStatus = "Rascunho" | "Gerado" | "Em edição" | "Aprovado";

export interface StudioProject {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_ensaio: string;
  status: ProjectStatus;
  created_at: string;
  photo_count?: number;
}

export interface StudioPhoto {
  id: string;
  project_id: string;
  image_url: string;
  storage_path: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  orientation: string | null;
  upload_order: number;
  url: string; // signed url pronta para uso
  thumbUrl: string; // versão leve para uso na interface
}

export const TIPOS_ENSAIO = [
  "Casamento",
  "Pré-Wedding",
  "Gestante",
  "Família",
  "Corporativo",
  "Debutante",
  "Formatura",
  "Outro",
];

const signPaths = async (
  paths: string[],
  transform?: { width: number; height: number; quality: number },
): Promise<Record<string, string>> => {
  if (!paths.length) return {};
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60 * 12, transform ? ({ transform } as any) : undefined);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d: any) => {
    if (d?.path && d?.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
};

/** Miniaturas via Supabase Image Transformations, com fallback para a URL completa. */
const signThumbs = async (paths: string[]): Promise<Record<string, string>> => {
  try {
    const map = await signPaths(paths, { width: 540, height: 675, quality: 72 });
    if (Object.keys(map).length) return map;
  } catch {
    /* transformações indisponíveis no projeto */
  }
  return {};
};

export const useProjects = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["studio-projects", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StudioProject[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const projects = (data ?? []) as any[];
      if (!projects.length) return [];
      const { data: photos } = await supabase
        .from("photos")
        .select("id, project_id");
      const counts: Record<string, number> = {};
      (photos ?? []).forEach((p: any) => {
        counts[p.project_id] = (counts[p.project_id] ?? 0) + 1;
      });
      return projects.map((p) => ({ ...p, photo_count: counts[p.id] ?? 0 }));
    },
  });
};

export const useProject = (projectId?: string) => {
  return useQuery({
    queryKey: ["studio-project", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<StudioProject> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
};

export const useProjectPhotos = (projectId?: string) => {
  return useQuery({
    queryKey: ["studio-photos", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<StudioPhoto[]> => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("project_id", projectId!)
        .order("upload_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const storagePaths = rows.map((r) => r.storage_path).filter(Boolean);
      const [map, thumbs] = await Promise.all([
        signPaths(storagePaths),
        signThumbs(storagePaths),
      ]);
      return rows.map((r) => {
        const url = map[r.storage_path] ?? r.image_url;
        return { ...r, url, thumbUrl: thumbs[r.storage_path] ?? url };
      });
    },
  });
};

export const useCreateProject = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo_ensaio: string;
      descricao: string;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, user_id: user!.id, status: "Rascunho" } as any)
        .select()
        .single();
      if (error) throw error;
      return data as any as StudioProject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio-projects"] }),
  });
};

export const useUpdateProjectStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase
        .from("projects")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      qc.invalidateQueries({ queryKey: ["studio-project"] });
    },
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio-projects"] }),
  });
};

const readImageSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

export const useUploadPhotos = (projectId?: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      files,
      startOrder = 0,
      onProgress,
      projectId: overrideId,
    }: {
      files: File[];
      startOrder?: number;
      onProgress?: (done: number, total: number) => void;
      projectId?: string;
    }) => {
      const pid = overrideId ?? projectId;
      if (!pid) throw new Error("Projeto não identificado");
      const totalAfterUpload = startOrder + files.length;
      if (totalAfterUpload > MAX_PHOTOS_PER_PROJECT) {
        throw new Error(
          `Limite de ${MAX_PHOTOS_PER_PROJECT} fotos por projeto atingido. Você pode enviar no máximo ${Math.max(0, MAX_PHOTOS_PER_PROJECT - startOrder)} foto(s) a mais.`,
        );
      }
      let done = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user!.id}/${pid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { width, height } = await readImageSize(file);
        const orientation =
          width === height ? "square" : width > height ? "landscape" : "portrait";
        const { error } = await supabase.from("photos").insert({
          project_id: pid,
          user_id: user!.id,
          image_url: path,
          storage_path: path,
          filename: file.name,
          width,
          height,
          orientation,
          upload_order: startOrder + i,
        } as any);
        if (error) throw error;
        done++;
        onProgress?.(done, files.length);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-photos"] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
    },
  });
};

export const useDeletePhoto = (projectId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: StudioPhoto) => {
      if (photo.storage_path) {
        await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      }
      const { error } = await supabase.from("photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-photos", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
    },
  });
};

export interface StudioCarousel {
  id: string;
  project_id: string;
  titulo: string | null;
  legenda: string | null;
  status: string;
  slides: EditorSlide[];
}

export const useCarousel = (projectId?: string) => {
  return useQuery({
    queryKey: ["studio-carousel", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<StudioCarousel | null> => {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const carousel = (data ?? [])[0] as any;
      if (!carousel) return null;

      const { data: slideRows } = await supabase
        .from("carousel_slides")
        .select("*")
        .eq("carousel_id", carousel.id)
        .order("slide_order", { ascending: true });
      const slideIds = (slideRows ?? []).map((s: any) => s.id);
      let slidePhotos: any[] = [];
      if (slideIds.length) {
        const { data: sp } = await supabase
          .from("slide_photos")
          .select("*")
          .in("slide_id", slideIds)
          .order("position", { ascending: true });
        slidePhotos = sp ?? [];
      }
      const slides: EditorSlide[] = (slideRows ?? []).map((s: any) => ({
        key: s.id,
        layout: s.layout_type,
        photoIds: slidePhotos
          .filter((p) => p.slide_id === s.id)
          .map((p) => p.photo_id),
      }));
      return { ...carousel, slides };
    },
  });
};

export const useSaveCarousel = (projectId?: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      carouselId,
      titulo,
      legenda,
      status,
      slides,
    }: {
      carouselId?: string;
      titulo?: string | null;
      legenda: string;
      status: string;
      slides: EditorSlide[];
    }) => {
      let id = carouselId;
      if (id) {
        const { error } = await supabase
          .from("carousels")
          .update({ titulo, legenda, status } as any)
          .eq("id", id);
        if (error) throw error;
        await supabase.from("carousel_slides").delete().eq("carousel_id", id);
      } else {
        const { data, error } = await supabase
          .from("carousels")
          .insert({
            project_id: projectId,
            user_id: user!.id,
            titulo,
            legenda,
            status,
          } as any)
          .select()
          .single();
        if (error) throw error;
        id = (data as any).id;
      }

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const { data: created, error } = await supabase
          .from("carousel_slides")
          .insert({
            carousel_id: id,
            user_id: user!.id,
            slide_order: i + 1,
            layout_type: slide.layout,
          } as any)
          .select()
          .single();
        if (error) throw error;
        const rows = slide.photoIds.map((photoId, position) => ({
          slide_id: (created as any).id,
          photo_id: photoId,
          user_id: user!.id,
          position,
        }));
        if (rows.length) {
          const { error: spErr } = await supabase
            .from("slide_photos")
            .insert(rows as any);
          if (spErr) throw spErr;
        }
      }
      return id!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-carousel", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
    },
  });
};