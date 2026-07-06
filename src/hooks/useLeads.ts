import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

const normalizeWhatsApp = (value: string | null | undefined) => (value || "").replace(/\D/g, "");
const MIN_WHATSAPP_DIGITS = 8;

// Canonical key used for dedup: strip BR country code and the optional 9th digit
// so that "558581041201", "8581041201" and "558581041201" all collapse to the
// same comparable value. Matches the logic of the SQL `whatsapp_match_key`.
const whatsappDedupKey = (raw: string | null | undefined) => {
  let d = normalizeWhatsApp(raw);
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  if (d.length === 11 && d[2] === "9") d = d.slice(0, 2) + d.slice(3);
  return d;
};

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

       // Só faz dedup se o número tiver dígitos suficientes para evitar
       // colisões absurdas (ex.: vazio bate com vazio, ou sufixo curto bate
       // com qualquer número). endsWith("") é sempre true em JS, então a
       // comparação anterior linkava qualquer coisa quando um dos lados era
       // vazio — foi o que vinculou várias conversas ao lead errado.
       if (normalizedWhatsapp.length >= MIN_WHATSAPP_DIGITS) {
         const dedupKey = whatsappDedupKey(normalizedWhatsapp);
         const { data: existingLeads, error: searchError } = await supabase
           .from("leads")
           .select("*")
           .eq("user_id", effectiveUserId)
           .is("deleted_at", null);

         if (searchError) throw searchError;

         const existingLead = dedupKey
           ? (existingLeads as Lead[]).find((item) => {
               const currentKey = whatsappDedupKey(item.whatsapp);
               return !!currentKey && currentKey === dedupKey;
             })
           : undefined;

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
      // Se o campo whatsapp está sendo alterado, normaliza e valida.
      // Aceitar valores sem dígitos (ex.: "c") já causou data corruption:
      // o trigger de link no inbox passa a casar conversas erradas com esse lead.
      if (Object.prototype.hasOwnProperty.call(lead, "whatsapp")) {
        const raw = String((lead as any).whatsapp ?? "");
        const digits = normalizeWhatsApp(raw);
        if (raw.trim() === "") {
          (lead as any).whatsapp = "";
        } else if (digits.length < MIN_WHATSAPP_DIGITS) {
          throw new Error("WhatsApp inválido. Informe pelo menos 8 dígitos ou deixe em branco.");
        } else {
          (lead as any).whatsapp = digits;
        }
      }

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
    mutationFn: async (input: string | { id: string; deleteTasks?: boolean }) => {
      const id = typeof input === "string" ? input : input.id;
      const deleteTasks = typeof input === "string" ? false : !!input.deleteTasks;

      if (deleteTasks) {
        const { error: tasksError } = await supabase
          .from("lead_tasks")
          .delete()
          .eq("lead_id", id);
        if (tasksError) throw tasksError;
      }

      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["deleted_leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead_tasks"] });
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
