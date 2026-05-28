import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export const useGoogleCalendarConnection = () => {
  const userId = useEffectiveUserId();

  return useQuery({
    queryKey: ["google-calendar-connection", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("id, google_email, calendar_id, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useConnectGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "google-calendar-auth-start",
        { body: { origin: window.location.origin } },
      );
      if (error) throw error;
      if (!data?.authUrl) throw new Error("authUrl ausente");

      const w = 520, h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        data.authUrl, "google-calendar-auth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) throw new Error("Popup bloqueado pelo navegador");

      return new Promise<boolean>((resolve, reject) => {
        const handler = (ev: MessageEvent) => {
          if (ev.data?.type === "google-calendar-auth") {
            window.removeEventListener("message", handler);
            clearInterval(closedCheck);
            if (ev.data.success) resolve(true);
            else reject(new Error("Conexão cancelada ou falhou"));
          }
        };
        window.addEventListener("message", handler);
        const closedCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(closedCheck);
            window.removeEventListener("message", handler);
            // Resolve true; the query refetch will determine actual state.
            resolve(false);
          }
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Google Agenda conectado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao conectar: " + error.message);
    },
  });
};

export const useDisconnectGoogleCalendar = () => {
  const queryClient = useQueryClient();
  const userId = useEffectiveUserId();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("google_calendar_connections")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Google Agenda desconectado.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao desconectar: " + error.message);
    },
  });
};

export const syncEventToGoogleCalendar = async (
  action: "create" | "update" | "delete",
  eventId: string,
) => {
  try {
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action, event_id: eventId },
    });
    if (error) throw error;
  } catch (e) {
    console.warn("Google Calendar sync failed:", e);
  }
};