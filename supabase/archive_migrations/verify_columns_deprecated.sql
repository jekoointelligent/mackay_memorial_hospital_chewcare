-- verify_columns.sql
-- 在 Supabase SQL Editor 執行此檔案，確認所有必要欄位均存在
-- 若某資料表有欄位缺少，請執行 migration_v4_fix_quiz_units.sql

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('courses', 'units', 'quiz_questions', 'groups', 'admin_users')
ORDER BY table_name, ordinal_position;

-- 預期結果（重點欄位）：
--   units           → description, published
--   quiz_questions  → explanation, published, created_at
--   groups          → description, sort_order, status, updated_at
--   admin_users     → role, status
