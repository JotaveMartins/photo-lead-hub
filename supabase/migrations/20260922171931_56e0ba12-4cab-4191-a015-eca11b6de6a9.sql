ALTER TABLE public.gallery_media
  ADD COLUMN IF NOT EXISTS preview_size_bytes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_size_bytes bigint NOT NULL DEFAULT 0;