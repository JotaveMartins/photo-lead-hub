import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export const useInteresseOptions = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["interesse_options", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("interesse_options" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("nome");
      if (error) throw error;
      return (data as any[]).map((d: any) => d.nome as string);
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateInteresseOption = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  return useMutation({
    mutationFn: async (nome: string) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("interesse_options" as any)
        .insert({ nome, user_id: effectiveUserId } as any);
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interesse_options"] });
    },
  });
};

export const useDeleteInteresseOption = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from("interesse_options" as any)
        .delete()
        .eq("nome", nome);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interesse_options"] });
    },
  });
};

export const useRenameInteresseOption = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { error: leadsError } = await supabase
        .from("leads")
        .update({ interesse: newName })
        .eq("interesse", oldName);
      if (leadsError) throw leadsError;

      const { error: optError } = await supabase
        .from("interesse_options" as any)
        .update({ nome: newName } as any)
        .eq("nome", oldName)
        .eq("user_id", effectiveUserId!);
      if (optError) throw optError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interesse_options"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};
