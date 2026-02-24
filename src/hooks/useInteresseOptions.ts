import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useInteresseOptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interesse_options", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interesse_options" as any)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data as any[]).map((d: any) => d.nome as string);
    },
    enabled: !!user,
  });
};

export const useCreateInteresseOption = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from("interesse_options" as any)
        .insert({ nome, user_id: user!.id } as any);
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      // 1. Update all leads that have the old interesse value
      const { error: leadsError } = await supabase
        .from("leads")
        .update({ interesse: newName })
        .eq("interesse", oldName);
      if (leadsError) throw leadsError;

      // 2. Update the option name
      const { error: optError } = await supabase
        .from("interesse_options" as any)
        .update({ nome: newName } as any)
        .eq("nome", oldName)
        .eq("user_id", user!.id);
      if (optError) throw optError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interesse_options"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};
