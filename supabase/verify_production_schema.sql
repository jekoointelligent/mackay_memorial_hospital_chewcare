-- ════════════════════════════════════════════════════════════════
-- 咀嚼照護衛教平台 — Production Schema 驗證查詢
-- 在 Supabase Dashboard → SQL Editor 執行此檔案，
-- 確認正式資料庫所有必要資料表、欄位、索引均存在。
--
-- 輸出說明：
--   found    = 欄位存在
--   MISSING  = 欄位缺少，需執行對應 migration 或 schema_production.sql
-- ════════════════════════════════════════════════════════════════

-- ── 1. 資料表是否存在 ────────────────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN 'found' ELSE 'MISSING' END AS status
FROM (VALUES
  ('groups'),
  ('admin_users'),
  ('users'),
  ('course_categories'),
  ('courses'),
  ('units'),
  ('quiz_questions'),
  ('progress'),
  ('unit_progress'),
  ('quiz_attempts'),
  ('materials'),
  ('home_banners'),
  ('feature_cards'),
  ('audit_logs')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = expected.table_name
ORDER BY expected.table_name;

-- ── 2. 關鍵欄位是否存在 ──────────────────────────────────────────
SELECT
  expected.table_name,
  expected.column_name,
  CASE WHEN c.column_name IS NOT NULL THEN 'found' ELSE 'MISSING' END AS status,
  c.data_type
FROM (VALUES
  -- users
  ('users',           'login_code'),
  ('users',           'tags'),
  ('users',           'status'),
  -- admin_users
  ('admin_users',     'role'),
  ('admin_users',     'status'),
  -- units（v12 欄位）
  ('units',           'source_type'),
  ('units',           'original_url'),
  ('units',           'storage_key'),
  ('units',           'storage_provider'),
  ('units',           'file_name'),
  ('units',           'file_size'),
  ('units',           'mime_type'),
  ('units',           'published'),
  -- quiz_questions（v11 + v13 欄位）
  ('quiz_questions',  'unit_id'),
  ('quiz_questions',  'explanation'),
  ('quiz_questions',  'published'),
  ('quiz_questions',  'created_at'),
  -- unit_progress（v5 資料表欄位）
  ('unit_progress',   'user_id'),
  ('unit_progress',   'unit_id'),
  ('unit_progress',   'course_id'),
  ('unit_progress',   'progress_percent'),
  ('unit_progress',   'completed'),
  ('unit_progress',   'last_position_seconds'),
  ('unit_progress',   'duration_seconds'),
  -- materials（v5 + v6 欄位）
  ('materials',       'status'),
  ('materials',       'asset_type'),
  ('materials',       'storage_provider'),
  ('materials',       'storage_key'),
  ('materials',       'mime_type'),
  -- home_banners（v7 資料表欄位）
  ('home_banners',    'image_url'),
  ('home_banners',    'status'),
  ('home_banners',    'sort_order'),
  -- feature_cards（v8 資料表欄位）
  ('feature_cards',   'status'),
  ('feature_cards',   'sort_order'),
  -- course_categories（v10 資料表欄位）
  ('course_categories','name'),
  ('course_categories','bg_color'),
  ('course_categories','text_color'),
  ('course_categories','status')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name   = expected.table_name
 AND c.column_name  = expected.column_name
ORDER BY expected.table_name, expected.column_name;

-- ── 3. 關鍵索引是否存在 ──────────────────────────────────────────
SELECT
  expected.indexname,
  CASE WHEN i.indexname IS NOT NULL THEN 'found' ELSE 'MISSING' END AS status
FROM (VALUES
  ('uq_users_phone_norm'),
  ('idx_users_login_code'),
  ('users_tags_gin'),
  ('idx_units_course'),
  ('idx_units_course_sort'),
  ('idx_quiz_course'),
  ('quiz_questions_unit_id_idx'),
  ('idx_unit_progress_user'),
  ('idx_unit_progress_course'),
  ('idx_unit_progress_unit'),
  ('idx_attempts_user'),
  ('idx_materials_course'),
  ('idx_materials_status'),
  ('idx_audit_created')
) AS expected(indexname)
LEFT JOIN pg_indexes i
  ON i.schemaname = 'public' AND i.indexname = expected.indexname
ORDER BY expected.indexname;

-- ── 4. RLS 是否開啟 ──────────────────────────────────────────────
SELECT
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'DISABLED — 請執行 ALTER TABLE ... ENABLE ROW LEVEL SECURITY' END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'groups','admin_users','users','course_categories',
    'courses','units','quiz_questions','progress','unit_progress',
    'quiz_attempts','materials','home_banners','feature_cards','audit_logs'
  )
ORDER BY c.relname;
