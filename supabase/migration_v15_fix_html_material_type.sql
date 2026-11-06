-- migration_v15_fix_html_material_type.sql
--
-- 選用：回填既有 materials 資料的 file_type，把「實際是 HTML、但因為是在自動判斷
-- 邏輯上線前上傳、file_type 還停留在 'other'（或任何非 'html' 值）」的資料改成 'html'。
--
-- ⚠️ 不是必要步驟：程式碼已改為用 lib/materialType.js 的 isHtmlMaterial()
-- （比對 mime_type / file_name / storage_key / file_url 副檔名，不只看 file_type）
-- 判斷是否為 HTML，所以就算不執行這支 migration，舊資料一樣能被素材管理正確辨識為
-- 「互動網頁」、一樣能出現在課程管理的 HTML 素材選擇器。這支 migration 純粹是讓
-- materials.file_type 欄位本身的值也「補正確」，方便日後直接用 file_type='html' 查詢、
-- 或在其他報表 / SQL 工具中檢視資料時不會顯示成「other」。
--
-- 執行前建議：
--   1. 先用下面的 SELECT 預覽會被更新到的筆數與內容，確認符合預期再執行 UPDATE。
--   2. 在正式環境執行前，建議先在 Supabase 的 staging / 一份備份上驗證。
--
-- 欄位名稱已對照 supabase/schema_production.sql 的 materials 表定義確認：
--   file_name text, file_url text, file_type text, mime_type text, storage_key text

-- ── Step 1：預覽（唯讀，不會修改任何資料）────────────────────────────────
-- SELECT id, title, file_name, file_type, mime_type, storage_key, status
-- FROM public.materials
-- WHERE
--   file_type IS DISTINCT FROM 'html'
--   AND (
--     lower(file_name)                     LIKE '%.html' OR lower(file_name)                     LIKE '%.htm'
--     OR lower(coalesce(storage_key, ''))  LIKE '%.html' OR lower(coalesce(storage_key, ''))      LIKE '%.htm'
--     OR lower(coalesce(mime_type, ''))    LIKE 'text/html%'
--   );

-- ── Step 2：回填（非破壞性 —— 只更新 file_type 這一欄，不刪除、不動其他欄位）───
UPDATE public.materials
SET file_type = 'html'
WHERE
  file_type IS DISTINCT FROM 'html'
  AND (
    lower(file_name)                    LIKE '%.html' OR lower(file_name)                    LIKE '%.htm'
    OR lower(coalesce(storage_key, '')) LIKE '%.html' OR lower(coalesce(storage_key, ''))     LIKE '%.htm'
    OR lower(coalesce(mime_type, ''))   LIKE 'text/html%'
  );

-- 選用：同時把 mime_type 補成標準值，讓 R2 / 瀏覽器都拿到一致的 Content-Type。
-- 只在 mime_type 目前不是 text/html 系列時才補，不覆蓋已經正確的值。
-- UPDATE public.materials
-- SET mime_type = 'text/html; charset=utf-8'
-- WHERE file_type = 'html'
--   AND lower(coalesce(mime_type, '')) NOT LIKE 'text/html%';
