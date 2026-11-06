-- migration_v4_fix_quiz_units.sql
-- 安全冪等：所有欄位均使用 ADD COLUMN IF NOT EXISTS，可重複執行
-- 用途：補充 migration_v3 遺漏的 quiz_questions.created_at，並確認所有欄位完整

-- ① quiz_questions：補 created_at（原始 schema 未建立此欄）
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS created_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS explanation  text,
  ADD COLUMN IF NOT EXISTS published    boolean NOT NULL DEFAULT true;

-- ② units：確保 migration_v3 新增欄位存在
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS published    boolean NOT NULL DEFAULT true;

-- ③ groups：確保 migration_v3 新增欄位存在
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS sort_order   int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status       text        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- ④ admin_users：確保 migration_v3 新增欄位存在
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role         text        NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status       text        NOT NULL DEFAULT 'active';

-- 執行完畢後請執行 verify_columns.sql 確認欄位均已建立
