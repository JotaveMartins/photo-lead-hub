import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StorageService } from "@/lib/storage/StorageService";

import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export type GalleryStatus = "draft" | "published" | "expired" | "archived";
export type GalleryType = "delivery" | "selection";

export interface Gallery {
  id: string;
  user_id: string;
  cliente_id: string | null;
  lead_id: string | null;
  entrega_id: string | null;
  name: string;
  slug: string;
  gallery_type: GalleryType;
  status: GalleryStatus;
  event_date: string | null;
  expires_at: string | null;
  password_hash: string | null;
  cover_media_id: string | null;
  download_enabled: boolean;
  download_quality: string;
  storage_bytes: number;
  media_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  clientes?: { nome: string } | null;
}

export interface GallerySection {
  id: string;
  gallery_id: string;
  name: string;
  sort_order: number;
}

export interface GalleryMedia {
  id: string;
  gallery_id: string;
  section_id: string | null;
  filename: string;
  media_type: string;
  original_key: string | null;
  thumbnail_key: string | null;
  preview_key: string | null;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  processing_status: "pending" | "processing" | "ready" | "failed";
  is_cover: boolean;
  is_disabled: boolean;
}

export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "galeria";

export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
  const mb = bytes / 1024 ** 2;
  return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
};

export const useGalleries = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["galleries", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*, clientes(nome)")
        .eq("user_id", userId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Gallery[];
    },
  });
};

export const useGallery = (id?: string) => {
  return useQuery({
    queryKey: ["gallery", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*, clientes(nome)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Gallery | null;
    },
  });
};

export const useGallerySections = (galleryId?: string) =>
  useQuery({
    queryKey: ["gallery-sections", galleryId],
    enabled: !!galleryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_sections")
        .select("*")
        .eq("gallery_id", galleryId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as GallerySection[];
    },
  });

export const useGalleryMedia = (galleryId?: string) =>
  useQuery({
    queryKey: ["gallery-media", galleryId],
    enabled: !!galleryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_media")
        .select("*")
        .eq("gallery_id", galleryId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as GalleryMedia[];
    },
  });

/** Capa e galeria de cada entrega, em uma única chamada (para os cards do funil). */
export const useEntregaCovers = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["entrega-covers", userId],
    enabled: !!userId,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { galleries, covers } = await StorageService.getCoverUrls();
      const map: Record<string, { galleryId: string; coverUrl: string | null; mediaCount: number }> = {};
      for (const g of galleries) {
        if (!g.entrega_id) continue;
        map[g.entrega_id] = {
          galleryId: g.id,
          coverUrl: covers[g.id] ?? null,
          mediaCount: g.media_count ?? 0,
        };
      }
      return map;
    },
  });
};

/** Galeria vinculada a uma entrega (uma por entrega). */

export const useGalleryByEntrega = (entregaId?: string | null) =>
  useQuery({
    queryKey: ["gallery-by-entrega", entregaId],
    enabled: !!entregaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*, clientes(nome)")
        .eq("entrega_id", entregaId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Gallery | null;
    },
  });

export interface NewGalleryInput {
  name: string;
  cliente_id?: string | null;
  lead_id?: string | null;
  entrega_id?: string | null;
  event_date?: string | null;
  password?: string | null;
  expires_in_days: number;
  download_enabled: boolean;
}

export const useCreateGallery = () => {
  const userId = useEffectiveUserId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewGalleryInput) => {
      if (!userId) throw new Error("Sessão inválida");
      const base = slugify(input.name);
      const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      const expires_at =
        input.expires_in_days > 0
          ? new Date(Date.now() + input.expires_in_days * 86400000).toISOString()
          : null;

      const { data, error } = await supabase
        .from("galleries")
        .insert({
          user_id: userId,
          name: input.name.trim(),
          slug,
          cliente_id: input.cliente_id || null,
          lead_id: input.lead_id || null,
          entrega_id: input.entrega_id || null,
          event_date: input.event_date || null,
          expires_at,
          download_enabled: input.download_enabled,
          gallery_type: "delivery",
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (input.password && input.password.length >= 4) {
        const { error: pwError } = await supabase.rpc("set_gallery_password", {
          _gallery_id: (data as any).id,
          _password: input.password,
        });
        if (pwError) throw pwError;
      }
      return data as unknown as Gallery;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["galleries"] });
      qc.invalidateQueries({ queryKey: ["gallery-by-entrega"] });
      toast.success("Galeria criada!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar galeria"),
  });
};

export const useUpdateGallery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("galleries").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v: any) => {
      qc.invalidateQueries({ queryKey: ["galleries"] });
      qc.invalidateQueries({ queryKey: ["gallery", v.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
};

export const useDeleteGallery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("galleries")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["galleries"] });
      qc.invalidateQueries({ queryKey: ["gallery-by-entrega"] });
      toast.success("Galeria excluída!");
    },
  });
};

export const useCreateSection = () => {
  const userId = useEffectiveUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ galleryId, name, sortOrder }: { galleryId: string; name: string; sortOrder: number }) => {
      const { error } = await supabase
        .from("gallery_sections")
        .insert({ gallery_id: galleryId, user_id: userId, name, sort_order: sortOrder } as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["gallery-sections", v.galleryId] });
      toast.success("Seção criada!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar seção"),
  });
};

/** Limite e consumo de armazenamento da conta. */
export const useStorageUsage = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["storage-usage", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("storage_limit_bytes, storage_used_bytes")
        .eq("user_id", userId!)
        .maybeSingle();
      const limit = Number((data as any)?.storage_limit_bytes ?? 10 * 1024 ** 3);
      const { data: rows } = await supabase
        .from("galleries")
        .select("storage_bytes")
        .eq("user_id", userId!)
        .is("deleted_at", null);
      const used = (rows ?? []).reduce((s: number, r: any) => s + Number(r.storage_bytes || 0), 0);
      return { limit, used };
    },
  });
};

export const useUpdateSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; galleryId: string; name: string }) => {
      const { error } = await supabase.from("gallery_sections").update({ name } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["gallery-sections", v.galleryId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao renomear seção"),
  });
};

export const useDeleteSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; galleryId: string }) => {
      const { error } = await supabase.from("gallery_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["gallery-sections", v.galleryId] });
      qc.invalidateQueries({ queryKey: ["gallery-media", v.galleryId] });
      toast.success("Seção excluída");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir seção"),
  });
};

/** Move uma foto para uma seção (ou para "sem seção"). */
export const useSetMediaSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mediaId, sectionId }: { mediaId: string; galleryId: string; sectionId: string | null }) => {
      const { error } = await supabase.from("gallery_media").update({ section_id: sectionId } as any).eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["gallery-media", v.galleryId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao mover foto"),
  });
};
