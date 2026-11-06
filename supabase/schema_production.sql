-- ════════════════════════════════════════════════════════════════
-- 咀嚼照護衛教平台 — Production Schema
-- 整合 schema.sql + migration_v2 ~ migration_v13
--
-- 使用時機：
--   全新 Supabase 專案初始化。
--   若已跑過 v2~v13，請「不要」重跑此檔案（見 README.md）。
--
-- 特性：
--   · CREATE TABLE IF NOT EXISTS（可重複執行，僅建立缺少的物件）
--   · CREATE INDEX IF NOT EXISTS
--   · RLS Policy 以 DO $$ BEGIN...IF NOT EXISTS...END $$ 防重複
--   · 不包含任何種子資料（見 seed_demo.sql）
--
-- 設計原則：
--   · 民眾「不可自行註冊」，一律由管理員開通
--   · 民眾用 10 碼 login_code 免密碼登入，需 status = 'active'
--   · 管理員密碼以 bcrypt hash 儲存，絕不明文
--   · SUPABASE_SERVICE_ROLE_KEY 不可放前端
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()


-- ════════════════════════════════════════════════════════════════
-- 1. groups — 民眾所屬分組（衛生所 / 機構）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  note        text,
  description text,
  sort_order  int         NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'active',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);


-- ════════════════════════════════════════════════════════════════
-- 2. admin_users — 後台管理員（與民眾完全分離）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,             -- bcrypt hash，絕不明文
  name          text        NOT NULL DEFAULT '管理員',
  role          text        NOT NULL DEFAULT 'admin',  -- admin | superadmin
  status        text        NOT NULL DEFAULT 'active', -- active | inactive
  created_at    timestamptz DEFAULT now(),
  last_login_at timestamptz
);


-- ════════════════════════════════════════════════════════════════
-- 3. users — 民眾使用者（僅管理員可開通，不可自行註冊）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  phone            text        NOT NULL,
  phone_normalized text        NOT NULL,
  login_code       text        NOT NULL UNIQUE,  -- 10 碼，預設 = phone_normalized
  group_id         uuid        REFERENCES public.groups(id) ON DELETE SET NULL,
  tags             text[]      NOT NULL DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'active',  -- active | inactive
  created_by       uuid        REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  last_login_at    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_norm  ON public.users(phone_normalized);
CREATE INDEX        IF NOT EXISTS idx_users_login_code  ON public.users(login_code);
CREATE INDEX        IF NOT EXISTS idx_users_status      ON public.users(status);
CREATE INDEX        IF NOT EXISTS idx_users_group       ON public.users(group_id);
CREATE INDEX        IF NOT EXISTS users_tags_gin        ON public.users USING GIN (tags);


-- ════════════════════════════════════════════════════════════════
-- 4. course_categories — 課程分類（後台動態管理，不寫死在程式碼）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.course_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  bg_color    text        NOT NULL DEFAULT '#FDECEA',
  text_color  text        NOT NULL DEFAULT '#E8392A',
  sort_order  int         NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.course_categories(sort_order);


-- ════════════════════════════════════════════════════════════════
-- 5. courses — 課程
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  category    text        NOT NULL,    -- 對應 course_categories.name
  description text,
  emoji       text        DEFAULT '🍽️',
  cover_url   text,
  sort_order  int         DEFAULT 0,
  published   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_sort     ON public.courses(sort_order);
CREATE INDEX IF NOT EXISTS idx_courses_pub      ON public.courses(published);


-- ════════════════════════════════════════════════════════════════
-- 6. units — 課程單元（影片 / 測驗 / 教材 / 文字）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.units (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid        REFERENCES public.courses(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  type             text        NOT NULL DEFAULT 'video',  -- video | quiz | material | text
  description      text,
  published        boolean     NOT NULL DEFAULT true,

  -- 影片播放
  video_kind       text,     -- youtube | upload | url | drive | r2 | library
  video_url        text,     -- 播放 URL（YouTube embed / presigned URL / drive preview）
  duration         text,     -- 時長顯示，例 "12:30"
  source_type      text,     -- youtube | r2_video | html5_video | google_drive_iframe | external_mp4
  original_url     text,     -- 原始分享連結（例如 Google Drive 分享 URL）

  -- Storage（R2 / Supabase）
  storage_provider text,     -- r2 | supabase
  storage_key      text,     -- R2 / Supabase storage object key
  file_name        text,     -- 上傳時的原始檔名（中文 OK）
  file_size        bigint,   -- bytes
  mime_type        text,

  sort_order       int         DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_units_course      ON public.units(course_id);
CREATE INDEX IF NOT EXISTS idx_units_course_sort ON public.units(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_units_pub         ON public.units(published);


-- ════════════════════════════════════════════════════════════════
-- 7. quiz_questions — 測驗題目
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid        REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id     uuid        REFERENCES public.units(id) ON DELETE CASCADE,  -- NULL = 課程層級（舊版相容）
  question    text        NOT NULL,
  options     jsonb       NOT NULL,   -- ["選項A","選項B","選項C","選項D"]
  answer      int         NOT NULL,   -- 正解索引（0-based）
  explanation text,                   -- 送出後才顯示給學員，絕不在作答前傳至前端
  published   boolean     NOT NULL DEFAULT true,
  sort_order  int         DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_course           ON public.quiz_questions(course_id);
CREATE INDEX IF NOT EXISTS quiz_questions_unit_id_idx ON public.quiz_questions(unit_id);
CREATE INDEX IF NOT EXISTS idx_quiz_pub              ON public.quiz_questions(published);


-- ════════════════════════════════════════════════════════════════
-- 8. progress — 課程總進度（每位使用者 × 每課程一列）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  course_id       uuid        REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_units jsonb       DEFAULT '[]',  -- 已完成 unit id 陣列（快取）
  pct             int         DEFAULT 0,     -- 課程完成百分比（快取）
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user   ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON public.progress(course_id);


-- ════════════════════════════════════════════════════════════════
-- 9. unit_progress — 單元觀看進度（每位使用者 × 每單元一列）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.unit_progress (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  unit_id               uuid        REFERENCES public.units(id) ON DELETE CASCADE,
  course_id             uuid        REFERENCES public.courses(id) ON DELETE CASCADE,
  last_position_seconds int         NOT NULL DEFAULT 0,
  duration_seconds      int         NOT NULL DEFAULT 0,
  progress_percent      int         NOT NULL DEFAULT 0,  -- 0~100
  completed             boolean     NOT NULL DEFAULT false,
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(user_id, unit_id)
);
CREATE INDEX IF NOT EXISTS idx_unit_progress_user   ON public.unit_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_course ON public.unit_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_unit   ON public.unit_progress(unit_id);


-- ════════════════════════════════════════════════════════════════
-- 10. quiz_attempts — 測驗作答紀錄（每次送出一列，可重考）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  course_id    uuid        REFERENCES public.courses(id) ON DELETE CASCADE,
  score        int         NOT NULL,
  passed       boolean     NOT NULL DEFAULT false,
  total        int,
  correct      int,
  attempted_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_user   ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_course ON public.quiz_attempts(course_id);


-- ════════════════════════════════════════════════════════════════
-- 11. materials — 教材 / 素材
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.materials (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  description      text,
  file_name        text        NOT NULL,   -- 原始檔名（含副檔名）
  file_path        text        NOT NULL,   -- Supabase Storage 路徑
  file_url         text        NOT NULL,   -- 公開存取 URL
  file_type        text,                   -- pdf | docx | pptx | image | video | html | other
  file_size        bigint      DEFAULT 0,  -- bytes
  mime_type        text,
  asset_type       text        NOT NULL DEFAULT 'document',  -- document | video | image | other
  storage_provider text,                   -- supabase | r2
  storage_key      text,
  course_id        uuid        REFERENCES public.courses(id) ON DELETE SET NULL,
  unit_id          uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  published        boolean     NOT NULL DEFAULT true,
  status           text        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'archived')),
  sort_order       int         NOT NULL DEFAULT 0,
  uploaded_by      uuid        REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_materials_course      ON public.materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_unit        ON public.materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_materials_status      ON public.materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_asset_type  ON public.materials(asset_type);


-- ════════════════════════════════════════════════════════════════
-- 12. home_banners — 首頁 Banner
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.home_banners (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL DEFAULT '',
  subtitle         text        DEFAULT '',
  image_url        text        DEFAULT '',
  image_path       text        DEFAULT '',    -- Supabase Storage 路徑
  storage_provider text,                      -- supabase | r2
  storage_key      text,
  link_url         text        DEFAULT '',
  button_text      text        DEFAULT '了解更多',
  sort_order       int         NOT NULL DEFAULT 0,
  status           text        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'archived')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_banners_status_sort ON public.home_banners(status, sort_order);


-- ════════════════════════════════════════════════════════════════
-- 13. feature_cards — 首頁功能卡片
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.feature_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  icon        text        NOT NULL DEFAULT '✨',
  title       text        NOT NULL DEFAULT '',
  description text        DEFAULT '',
  bg_color    text        DEFAULT '#FDECEA',
  sort_order  int         NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'archived')),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feature_cards_sort ON public.feature_cards(status, sort_order);


-- ════════════════════════════════════════════════════════════════
-- 14. audit_logs — 稽核日誌（登入、操作紀錄）
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  text        NOT NULL DEFAULT 'user',  -- user | admin | system
  actor_id    uuid,       -- users.id 或 admin_users.id
  actor_name  text,
  action      text        NOT NULL,  -- 登入成功 / 新增使用者 / 提交測驗...
  target      text,                  -- 受影響對象描述
  ip          text,
  device      text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON public.audit_logs(action);


-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- 前台一律透過後端 API（service role）存取，service role 自動 bypass RLS。
-- RLS 在此僅作安全防線，防止意外直連洩漏資料。
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_banners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_cards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- 前台可讀已發布課程（API bypass 後此政策不影響正常流程）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'read published courses') THEN
    CREATE POLICY "read published courses" ON public.courses FOR SELECT USING (published = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'read published units') THEN
    CREATE POLICY "read published units" ON public.units FOR SELECT USING (published = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'materials' AND policyname = 'read published materials') THEN
    CREATE POLICY "read published materials" ON public.materials FOR SELECT USING (published = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_categories' AND policyname = 'service role full access on course_categories') THEN
    CREATE POLICY "service role full access on course_categories" ON public.course_categories FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'home_banners' AND policyname = 'service role full access on home_banners') THEN
    CREATE POLICY "service role full access on home_banners" ON public.home_banners FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_cards' AND policyname = 'service role full access on feature_cards') THEN
    CREATE POLICY "service role full access on feature_cards" ON public.feature_cards FOR ALL USING (true);
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 完成
-- 接下來請至 Supabase Dashboard → Storage 建立以下 bucket：
--   · materials（Public: true）— 存放課程教材
--   · banners  （Public: true）— 存放 Banner 圖片
-- 若使用 Cloudflare R2，無需在 Supabase Storage 建立 bucket，
-- 請設定 .env.local 中的 R2 相關環境變數。
-- ════════════════════════════════════════════════════════════════
