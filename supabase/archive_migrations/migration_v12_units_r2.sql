-- migration_v12_units_r2.sql
-- 擴充 units 資料表，支援 Cloudflare R2 影片上傳與 Google Drive 原始連結
-- 請在 Supabase SQL Editor 手動執行此 migration

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS source_type    text,        -- youtube | r2_video | html5_video | google_drive_iframe | external_mp4
  ADD COLUMN IF NOT EXISTS original_url   text,        -- Google Drive 原始分享連結（video_url 存 preview URL）
  ADD COLUMN IF NOT EXISTS storage_key    text,        -- R2 object key（方便未來管理 / 刪除）
  ADD COLUMN IF NOT EXISTS file_name      text,        -- 上傳時的原始檔名（中文OK，不用於路徑）
  ADD COLUMN IF NOT EXISTS file_size      bigint;      -- 檔案大小（bytes）

-- 從現有 video_kind 反推 source_type（選擇性執行，不影響功能）
-- UPDATE public.units SET source_type = 'youtube'             WHERE video_kind = 'youtube'  AND source_type IS NULL;
-- UPDATE public.units SET source_type = 'google_drive_iframe' WHERE video_kind = 'drive'    AND source_type IS NULL;
-- UPDATE public.units SET source_type = 'html5_video'         WHERE video_kind = 'upload'   AND source_type IS NULL;
-- UPDATE public.units SET source_type = 'html5_video'         WHERE video_kind = 'library'  AND source_type IS NULL;
-- UPDATE public.units SET source_type = 'external_mp4'        WHERE video_kind = 'url'      AND source_type IS NULL;
