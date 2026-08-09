import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export interface InstagramAccount {
  id: string;
  username: string | null;
  profile_picture_url: string | null;
  instagram_user_id: string | null;
  token_expires_at: string | null;
  status: string;
  created_at: string;
}

export type PostStatus = "agendado" | "publicando" | "publicado" | "falhou" | "cancelado";

export interface ScheduledPost {
  id: string;
  carousel_id: string;
  scheduled_at: string;
  timezone: string;
  status: PostStatus;
  attempts: number;
  last_error: string | null;
  instagram_media_id: string | null;
  published_at: string | null;
  caption: string | null;
  projectId: string | null;
  projectName: string;
  slideCount: number;
}

/* ---------------- Instagram account ---------------- */

export const useInstagramAccount = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["instagram-account", userId],
    queryFn: async (): Promise<InstagramAccount | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("social_accounts")
        .select(
          "id, username, profile_picture_url, instagram_user_id, token_expires_at, status, created_at",
        )
        .eq("user_id", userId)
        .eq("provider", "instagram")
        .maybeSingle();
      if (error) throw error;
      return data as InstagramAccount | null;
    },
    enabled: !!userId,
  });
};

export const useConnectInstagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-auth-start", {
        body: { origin: window.location.origin },
      });
      if (error) throw new Error("Integração do Instagram ainda não configurada (App ID/Secret).");
      if (!data?.authUrl) throw new Error("authUrl ausente");

      const w = 520, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        data.authUrl,
        "instagram-auth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) throw new Error("Popup bloqueado pelo navegador");

      return new Promise<boolean>((resolve, reject) => {
        const handler = (ev: MessageEvent) => {
          if (ev.data?.type === "instagram-auth") {
            cleanup();
            ev.data.success ? resolve(true) : reject(new Error("Conexão cancelada ou falhou"));
          }
        };
        const closedCheck = setInterval(() => {
          if (popup.closed) {
            cleanup();
            resolve(true);
          }
        }, 800);
        const cleanup = () => {
          clearInterval(closedCheck);
          window.removeEventListener("message", handler);
        };
        window.addEventListener("message", handler);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["instagram-account"] }),
  });
};

export const useDisconnectInstagram = () => {
  const queryClient = useQueryClient();
  const userId = useEffectiveUserId();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("user_id", userId!)
        .eq("provider", "instagram");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instagram-account"] }),
  });
};

/* ---------------- Scheduled posts ---------------- */

export const useScheduledPosts = () => {
  const userId = useEffectiveUserId();
  return useQuery({
    queryKey: ["scheduled-posts", userId],
    queryFn: async (): Promise<ScheduledPost[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select(
          `id, carousel_id, scheduled_at, timezone, status, attempts, last_error,
           instagram_media_id, published_at,
           carousels ( legenda, rendered_slides, project_id, projects ( nome ) )`,
        )
        .eq("user_id", userId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        carousel_id: row.carousel_id,
        scheduled_at: row.scheduled_at,
        timezone: row.timezone,
        status: row.status as PostStatus,
        attempts: row.attempts ?? 0,
        last_error: row.last_error,
        instagram_media_id: row.instagram_media_id,
        published_at: row.published_at,
        caption: row.carousels?.legenda ?? null,
        projectId: row.carousels?.project_id ?? null,
        projectName: row.carousels?.projects?.nome ?? "Projeto",
        slideCount: Array.isArray(row.carousels?.rendered_slides)
          ? row.carousels.rendered_slides.length
          : 0,
      }));
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });
};

export const useCarouselScheduledPost = (carouselId?: string) => {
  const { data = [] } = useScheduledPosts();
  return data.find(
    (p) => p.carousel_id === carouselId && ["agendado", "publicando"].includes(p.status),
  );
};

export const useSchedulePost = () => {
  const queryClient = useQueryClient();
  const userId = useEffectiveUserId();
  return useMutation({
    mutationFn: async (input: {
      carouselId: string;
      socialAccountId: string;
      scheduledAt: string; // ISO
    }) => {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .insert({
          user_id: userId!,
          carousel_id: input.carouselId,
          social_account_id: input.socialAccountId,
          scheduled_at: input.scheduledAt,
          timezone: "America/Sao_Paulo",
          status: "agendado",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });
};

export const useReschedulePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ scheduled_at: scheduledAt, status: "agendado", last_error: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });
};

export const useCancelPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "cancelado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });
};

export const usePublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke("publish-instagram-carousel", {
        body: { post_id: postId },
      });
      if (error) {
        const details =
          (error as any)?.context?.text != null
            ? await (error as any).context.text()
            : error.message;
        throw new Error(details || "Falha ao publicar");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });
};