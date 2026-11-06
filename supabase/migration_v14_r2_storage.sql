-- migration_v14_r2_storage.sql
-- 為既有資料庫加入 Cloudflare R2 儲存欄位
-- 可重複執行（IF NOT EXISTS）

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS storage_key      text,
  ADD COLUMN IF NOT EXISTS storage_provider text,
  ADD COLUMN IF NOT EXISTS mime_type        text;

ALTER TABLE public.home_banners
  ADD COLUMN IF NOT EXISTS storage_key      text,
  ADD COLUMN IF NOT EXISTS storage_provider text;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS storage_provider text,
  ADD COLUMN IF NOT EXISTS mime_type        text;
