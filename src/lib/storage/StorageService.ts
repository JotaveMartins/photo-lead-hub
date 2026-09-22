import { supabase } from "@/integrations/supabase/client";

/**
 * Camada isolada de armazenamento das galerias (Cloudflare R2).
 *
 * Nenhuma credencial do provedor vive no frontend: toda operação é delegada à
 * edge function `gallery-storage`, que valida usuário, galeria e espaço
 * disponível antes de gerar URLs assinadas temporárias.
 */

export interface UploadUrlRequest {
  galleryId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  sectionId?: string | null;
  width?: number;
  height?: number;
}

export interface UploadTarget {
  key: string;
  uploadUrl: string;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
  original: UploadTarget;
  preview: UploadTarget;
  thumbnail: UploadTarget;
  expiresAt: string;
}

export interface MediaUrls {
  [mediaId: string]: { thumb: string | null; preview: string | null };
}

const call = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("gallery-storage", {
    body: { action, ...payload },
  });
  if (error) {
    // Erros HTTP trazem o corpo em context.
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.json) msg = (await ctx.json())?.error ?? msg;
      else if (ctx?.text) msg = JSON.parse(await ctx.text())?.error ?? msg;
    } catch { /* ignora */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const StorageService = {
  createUploadUrl: (req: UploadUrlRequest) => call<UploadUrlResponse>("create-upload-url", { ...req }),

  retryDerivativesUrl: (mediaId: string) =>
    call<{ mediaId: string; preview: UploadTarget; thumbnail: UploadTarget }>(
      "retry-derivatives-url",
      { mediaId },
    ),

  confirmUpload: (mediaId: string, dims?: { width?: number; height?: number }) =>
    call<{ ok: boolean; status: string; sizeBytes: number; storageUsedBytes: number }>(
      "confirm-upload",
      { mediaId, ...dims },
    ),

  deleteMedia: (mediaId: string) => call<{ ok: true }>("delete-media", { mediaId }),

  getViewUrl: (mediaId: string) => call<{ url: string }>("get-view-url", { mediaId }),

  getGalleryMediaUrls: (galleryId: string, mediaIds?: string[]) =>
    call<{ urls: MediaUrls }>("get-media-urls", { galleryId, mediaIds }),
};

/** Envia o arquivo direto ao R2 com progresso. */
export const putToR2 = (url: string, file: Blob, onProgress?: (pct: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no envio (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar a foto"));
    xhr.send(file);
  });

export default StorageService;
