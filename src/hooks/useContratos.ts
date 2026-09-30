import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Contrato = Database["public"]["Tables"]["contratos"]["Row"];
type ContratoInsert = Database["public"]["Tables"]["contratos"]["Insert"];
type ContratoUpdate = Database["public"]["Tables"]["contratos"]["Update"];

export type ContratoStatus = "aguardando_contrato" | "contrato_enviado" | "contrato_assinado";

export { type Contrato };

export const useContratos = (status?: ContratoStatus) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["contratos", effectiveUserId, status],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      let query = supabase
        .from("contratos")
        .select("*")
        .eq("user_id", effectiveUserId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useContratosByClienteId = (clienteId?: string) => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["contratos-cliente", clienteId, effectiveUserId],
    queryFn: async () => {
      if (!clienteId || !effectiveUserId) return [];

      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!clienteId && !!effectiveUserId,
  });
};

export const useDeletedContratos = () => {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["contratos-deleted", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("user_id", effectiveUserId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!effectiveUserId,
  });
};

export const useCreateContrato = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (contrato: Omit<ContratoInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contratos")
        .insert({ ...contrato, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-cliente"] });
    },
    onError: () => {
      toast.error("Erro ao criar contrato.");
    },
  });
};

export const useUpdateContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ContratoUpdate) => {
      const { data, error } = await supabase
        .from("contratos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-cliente"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar contrato.");
    },
  });
};

export const useDeleteContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-cliente"] });
      toast.success("Contrato arquivado.");
    },
  });
};

export const useRestoreContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-deleted"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-cliente"] });
      toast.success("Contrato restaurado.");
    },
  });
};

const BUCKET = "contratos";

/** Extrai o object path de contratos antigos que só têm URL pública. */
export const getContratoPath = (c: Pick<Contrato, "arquivo_contrato_path" | "arquivo_contrato_url">): string | null => {
  if (c.arquivo_contrato_path) return c.arquivo_contrato_path;
  const m = c.arquivo_contrato_url?.match(/\/storage\/v1\/object\/(?:public|sign)\/contratos\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

export const getContratoFileKind = (path: string | null): "pdf" | "image" | "doc" | null => {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext && ["jpg", "jpeg", "png"].includes(ext)) return "image";
  return "doc";
};

/** Signed URL temporária (15 min), nunca persistida. */
export const useContratoSignedUrl = (path: string | null) =>
  useQuery({
    queryKey: ["contrato-signed-url", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 900);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

const isNotFound = (err: any) =>
  err?.statusCode === "404" || err?.status === 404 || /not.?found/i.test(err?.message ?? "");

export const usePermanentDeleteContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row, error: fetchError } = await supabase
        .from("contratos")
        .select("arquivo_contrato_path, arquivo_contrato_url")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const path = getContratoPath(row);
      if (path) {
        const { error: rmError } = await supabase.storage.from(BUCKET).remove([path]);
        if (rmError && !isNotFound(rmError)) throw rmError;
      }

      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos-deleted"] });
      toast.success("Contrato excluído permanentemente.");
    },
    onError: () => {
      toast.error("Não foi possível remover o arquivo. O contrato não foi excluído.");
    },
  });
};

export const useUploadContratoFile = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ contratoId, file }: { contratoId: string; file: File }) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");

      const { data: current } = await supabase
        .from("contratos")
        .select("arquivo_contrato_path, arquivo_contrato_url")
        .eq("id", contratoId)
        .single();
      const oldPath = current ? getContratoPath(current) : null;

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${effectiveUserId}/${contratoId}/contrato.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data, error: updateError } = await supabase
        .from("contratos")
        .update({ arquivo_contrato_path: path, arquivo_contrato_url: null, status: "contrato_enviado" })
        .eq("id", contratoId)
        .select()
        .single();
      if (updateError) throw updateError;

      if (oldPath && oldPath !== path) {
        const { error: rmError } = await supabase.storage.from(BUCKET).remove([oldPath]);
        if (rmError && !isNotFound(rmError)) {
          console.error("Falha ao remover arquivo anterior do contrato:", rmError);
          toast.warning("Novo arquivo salvo, mas o arquivo anterior não pôde ser removido.");
        }
      }
      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-cliente"] });
      queryClient.invalidateQueries({ queryKey: ["contrato-signed-url"] });
      toast.success("Contrato anexado! Card movido para Contrato Enviado.");
    },
    onError: () => {
      toast.error("Erro ao anexar contrato.");
    },
  });
};
