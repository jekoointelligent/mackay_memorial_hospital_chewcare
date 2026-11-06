  -- migration_v9_user_tags.sql
  -- 使用者標籤（自由輸入，多值）
  ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

  -- 加速標籤查詢（GIN index）
  CREATE INDEX IF NOT EXISTS users_tags_gin ON public.users USING GIN (tags);
