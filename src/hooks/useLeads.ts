import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

const normalizeWhatsApp = (value: string | null | undefined) => (value || "").replace(/\D/g, "");

export const useLeads = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["leads", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (lead: Omit<LeadInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

       const normalizedWhatsapp = normalizeWhatsApp(String(lead.whatsapp || ""));

       if (normalizedWhatsapp) {
         const { data: existingLeads, error: searchError } = await supabase
           .from("leads")
           .select("*")
           .eq("user_id", effectiveUserId)
           .is("deleted_at", null);

         if (searchError) throw searchError;

         const existingLead = (existingLeads as Lead[]).find((item) => {
           const current = normalizeWhatsApp(item.whatsapp);
           return current === normalizedWhatsapp || current.endsWith(normalizedWhatsapp) || normalizedWhatsapp.endsWith(current);
         });

         if (existingLead) {
           return existingLead;
         }
       }

      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, whatsapp: normalizedWhatsapp || String(lead.whatsapp || ""), user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar lead: " + error.message);
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lead }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(lead)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar lead: " + error.message);
    },
  });
};

export const useBulkUpdateLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: LeadUpdate }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("leads")
        .update(updates)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${ids.length} lead(s) atualizado(s)!`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar leads: " + error.message);
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["deleted_leads"] });
      toast.success("Lead movido para a lixeira!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir lead: " + error.message);
    },
  });
};

export const useDeletedLeads = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["deleted_leads", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", effectiveUserId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as (Lead & { deleted_at: string })[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useRestoreLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: null } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["deleted_leads"] });
      toast.success("Lead restaurado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao restaurar lead: " + error.message);
    },
  });
};

export const usePermanentDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted_leads"] });
      toast.success("Lead excluído permanentemente!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir lead: " + error.message);
    },
  });
};
