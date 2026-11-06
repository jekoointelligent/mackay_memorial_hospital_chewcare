-- ════════════════════════════════════════════════════════════════
-- migration_v3.sql — 補齊所有後台新功能所需欄位
-- 在 Supabase Dashboard → SQL Editor 貼上整段執行
-- 全部使用 ADD COLUMN IF NOT EXISTS，可安全重複執行
-- ════════════════════════════════════════════════════════════════

-- ── groups 補充欄位 ──────────────────────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- ── admin_users 補充欄位 ─────────────────────────────────────────
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role   text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- ── units 補充欄位 ───────────────────────────────────────────────
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS published   boolean NOT NULL DEFAULT true;

-- ── quiz_questions 補充欄位 ──────────────────────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS published   boolean NOT NULL DEFAULT true;

-- ════════════════════════════════════════════════════════════════
-- 確認結果（執行後應看到各表的所有欄位）
-- ════════════════════════════════════════════════════════════════
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('groups', 'admin_users', 'units', 'quiz_questions')
ORDER BY table_name, ordinal_position;
