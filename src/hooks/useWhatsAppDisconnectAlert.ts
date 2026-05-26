import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export const useWhatsAppDisconnectAlert = () => {
  const { data: instances = [] } = useWhatsAppInstances();
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  const prevStatusMap = useRef<Record<string, string>>({});
  const initialized = useRef(false);

  // Detect connected → disconnected transitions
  useEffect(() => {
    if (!initialized.current) {
      instances.forEach((inst) => {
        prevStatusMap.current[inst.id] = inst.status ?? "disconnected";
      });
      initialized.current = true;
      return;
    }

    instances.forEach((inst) => {
      const prev = prevStatusMap.current[inst.id];
      if (prev === "connected" && inst.status === "disconnected") {
        toast.error("Canal WhatsApp desconectado", {
          description: `A instância "${inst.name || "WhatsApp"}" perdeu a conexão. Reconecte nas configurações.`,
          duration: Infinity,
          action: {
            label: "Configurações",
            onClick: () => { window.location.href = "/whatsapp"; },
          },
        });
      }
      prevStatusMap.current[inst.id] = inst.status ?? "disconnected";
    });
  }, [instances]);

  // Global realtime subscription to keep instances query fresh
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel("whatsapp-disconnect-watcher")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whatsapp_instances" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, queryClient]);
};
