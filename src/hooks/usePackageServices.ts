import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  created_at: string;
}

export const usePackageServicesForPackage = (packageId: string | undefined) => {
  return useQuery({
    queryKey: ["package_services", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("package_services")
        .select("*")
        .eq("package_id", packageId);

      if (error) throw error;
      return data as PackageService[];
    },
    enabled: !!packageId,
  });
};

export const useAddServiceToPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ package_id, service_id }: { package_id: string; service_id: string }) => {
      const { data, error } = await supabase
        .from("package_services")
        .insert({ package_id, service_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["package_services", variables.package_id] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar serviço: " + error.message);
    },
  });
};

export const useRemoveServiceFromPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, package_id }: { id: string; package_id: string }) => {
      const { error } = await supabase.from("package_services").delete().eq("id", id);
      if (error) throw error;
      return package_id;
    },
    onSuccess: (package_id) => {
      queryClient.invalidateQueries({ queryKey: ["package_services", package_id] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover serviço: " + error.message);
    },
  });
};
