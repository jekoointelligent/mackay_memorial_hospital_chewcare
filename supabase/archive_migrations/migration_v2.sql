-- ════════════════════════════════════════════════════════════════
-- 咀嚼照護衛教平台 — Migration v2
-- 在 Supabase Dashboard → SQL Editor 貼上整段執行
-- 驗證：SELECT column_name FROM information_schema.columns
--       WHERE table_name IN ('groups','admin_users','units');
-- ════════════════════════════════════════════════════════════════

-- 1. groups：補 description / sort_order / status / updated_at
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- 2. admin_users：補 role / status
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role   text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 3. units：補 description / published
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS published   boolean NOT NULL DEFAULT true;

-- ── 驗證查詢（執行後看 result）──
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('groups','admin_users','units')
  AND column_name IN ('description','sort_order','status','updated_at','role','published')
ORDER BY table_name, column_name;
