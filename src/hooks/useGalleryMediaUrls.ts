import { useQuery } from "@tanstack/react-query";
import { StorageService } from "@/lib/storage/StorageService";

/**
 * URLs temporárias (1h) de miniatura e visualização de todas as fotos da galeria,
 * buscadas em lote. Nunca são salvas no banco.
 */
export const useGalleryMediaUrls = (galleryId?: string, mediaCount = 0) =>
  useQuery({
    queryKey: ["gallery-media-urls", galleryId, mediaCount],
    enabled: !!galleryId && mediaCount > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => (await StorageService.getGalleryMediaUrls(galleryId!)).urls,
  });
