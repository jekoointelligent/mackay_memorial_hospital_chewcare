-- migration_v16_html_track_progress.sql
-- 讓「互動網頁（HTML）」單元可以選擇是否計入課程學習進度。
-- 例如 EAT-10 這類自我評估／工具型 HTML：使用者可重複使用、分數只存在 HTML 本身，
-- 不應該讓它左右整門課程的完成度。
--
-- 可重複執行（IF NOT EXISTS）；非破壞性，只新增一個有預設值的欄位，不動既有資料、
-- 不刪除任何欄位或資料列。
--
-- 欄位名稱已對照 supabase/schema_production.sql 的 units 表定義確認，目前沒有任何
-- 類似欄位（已用 grep 檢查過 schema_production.sql 及所有 archive_migrations）。
--
-- 重要：DEFAULT false 會套用到「所有既有單元」，不只是新單元 —— 這代表包含目前
-- 已存在的 EAT-10 單元在內，所有影片 / 測驗 / HTML 單元執行完這支 migration 後
-- track_progress 一律先是 false。影片與測驗單元的進度計算邏輯不會去看這個欄位
-- （它們永遠照原本規則計入進度），只有 interactive_html 單元會依這個欄位決定
-- 是否計入 progress 分母，所以不需要另外針對 EAT-10 下一次 UPDATE。

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS track_progress boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.units.track_progress IS
  '僅對 type=interactive_html 有意義：true 才計入課程進度分母、才顯示「完成本單元」並寫入 unit_progress；false（預設）代表自我評估／工具型內容，可重複使用，不影響 progress.pct。';
