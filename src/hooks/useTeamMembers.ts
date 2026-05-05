import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  funcao: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  eventos_count?: number;
}

export const useTeamMembers = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["team_members", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [] as TeamMember[];
      const { data, error } = await (supabase as any)
        .from("team_members")
        .select("*, event_team_members(event_id, events!inner(deleted_at))")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        eventos_count: (m.event_team_members || []).filter(
          (etm: any) => etm.events && etm.events.deleted_at === null,
        ).length,
      })) as TeamMember[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateTeamMember = () => {
  const qc = useQueryClient();
  const userId = useEffectiveUserId();
  return useMutation({
    mutationFn: async (data: { nome: string; telefone?: string | null; funcao?: string | null }) => {
      if (!userId) throw new Error("Usuário não autenticado");
      const { data: row, error } = await (supabase as any)
        .from("team_members")
        .insert({ user_id: userId, nome: data.nome, telefone: data.telefone || null, funcao: data.funcao || null })
        .select()
        .single();
      if (error) throw error;
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Profissional cadastrado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const useUpdateTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; telefone?: string | null; funcao?: string | null; ativo?: boolean }) => {
      const { error } = await (supabase as any).from("team_members").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Profissional atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const useDeleteTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("team_members")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Profissional removido!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

// ---- event_team_members helpers ----

export const useEventTeamMembers = (eventId: string | undefined | null) => {
  return useQuery({
    queryKey: ["event_team_members", eventId],
    queryFn: async () => {
      if (!eventId) return [] as { team_member_id: string }[];
      const { data, error } = await (supabase as any)
        .from("event_team_members")
        .select("team_member_id, team_members(nome, funcao)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });
};

export const useReplaceEventTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, memberIds }: { eventId: string; memberIds: string[] }) => {
      const { error: delErr } = await (supabase as any)
        .from("event_team_members")
        .delete()
        .eq("event_id", eventId);
      if (delErr) throw delErr;
      if (memberIds.length === 0) return;
      const rows = memberIds.map((id) => ({ event_id: eventId, team_member_id: id }));
      const { error } = await (supabase as any).from("event_team_members").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_team_members"] });
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
};