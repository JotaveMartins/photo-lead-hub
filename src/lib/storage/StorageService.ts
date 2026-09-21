import { supabase } from "@/integrations/supabase/client";

/**
 * Camada isolada de armazenamento das galerias.
 *
 * Nenhuma credencial do provedor (Cloudflare R2) vive no frontend: toda operação
 * privada é delegada à edge function `gallery-storage`, que valida usuário,
 * galeria e espaço disponível antes de gerar URLs assinadas temporárias.
 */

export type MediaKeyKind = "originals" | "previews" | "thumbs";

export const buildMediaKey = (
  userId: string,
  galleryId: string,
  mediaId: string,
  kind: MediaKeyKind,
  ext: string,
) => `galleries/${userId}/${galleryId}/${kind}/${mediaId}.${ext}`;

export interface UploadUrlRequest {
  galleryId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  originalKey: string;
  mediaId: string;
}

const call = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("gallery-storage", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const StorageService = {
  /** URL assinada para o navegador enviar o arquivo direto ao bucket. */
  createUploadUrl: (req: UploadUrlRequest) => call<UploadUrlResponse>("create-upload-url", req),

  deleteObject: (key: string) => call<{ ok: true }>("delete-object", { key }),

  getDownloadUrl: (key: string) => call<{ url: string }>("get-download-url", { key }),

  /** Previews/thumbs podem ser públicos via R2_PUBLIC_BASE_URL. */
  getPreviewUrl: (key: string) => call<{ url: string }>("get-preview-url", { key }),
};

export default StorageService;
