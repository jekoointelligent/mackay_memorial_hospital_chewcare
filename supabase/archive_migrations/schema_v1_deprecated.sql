-- ════════════════════════════════════════════════════════════════
-- 咀嚼照護衛教平台 — 資料庫 Schema（v3，依最新確認需求）
-- 在 Supabase Dashboard → SQL Editor 貼上整段執行
-- 設計原則：
--   • 民眾「不可自行註冊」，一律由管理員在後台開通
--   • 民眾用 10 碼 login_code（預設＝手機號）免密碼登入，需 status=active
--   • 內部主鍵一律 UUID，不用手機號 / login_code 當主鍵
--   • 只追蹤「學習進度」，不存任何病歷 / 診斷 / 健康評估等敏感醫療資料
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ── 分組 ────────────────────────────────────────────────────
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- 例：北區衛生所
  note        text,
  created_at  timestamptz default now()
);

-- ── 後台管理員 ──────────────────────────────────────────────
-- 與民眾 users 完全分離。密碼以 bcrypt hash 儲存。
create table if not exists public.admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,               -- bcrypt
  name          text not null default '管理員',
  created_at    timestamptz default now(),
  last_login_at timestamptz
);

-- ── 民眾使用者 ──────────────────────────────────────────────
create table if not exists public.users (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null,            -- 原始輸入手機號
  phone_normalized text not null,            -- 去除符號後的標準化號碼，唯一
  login_code       text not null unique,     -- 10 碼登入序號，預設＝phone_normalized
  group_id         uuid references public.groups(id) on delete set null,
  status           text not null default 'active',  -- active | inactive
  created_by       uuid references public.admin_users(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_login_at    timestamptz
);
create unique index if not exists uq_users_phone_norm on public.users(phone_normalized);
create index if not exists idx_users_login_code on public.users(login_code);
create index if not exists idx_users_status on public.users(status);

-- ── 課程 ────────────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null,                 -- 咀嚼照護 / 吞嚥訓練 / 飲食調整
  description text,
  emoji       text default '🍽️',
  cover_url   text,
  sort_order  int  default 0,
  published   boolean default true,
  created_at  timestamptz default now()
);

-- ── 單元（影片 / 測驗）──────────────────────────────────────
create table if not exists public.units (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid references public.courses(id) on delete cascade,
  title        text not null,
  type         text not null default 'video',  -- video | quiz
  video_kind   text,                            -- youtube | upload | url
  video_url    text,
  duration     text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_units_course on public.units(course_id);

-- ── 測驗題目 ────────────────────────────────────────────────
create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  question    text not null,
  options     jsonb not null,                -- ["A","B","C","D"]
  answer      int  not null,                 -- 正解索引 0-based
  sort_order  int default 0
);
create index if not exists idx_quiz_course on public.quiz_questions(course_id);

-- ── 學習進度（每位使用者 × 每課程一列）────────────────────────
create table if not exists public.progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade,
  course_id       uuid references public.courses(id) on delete cascade,
  completed_units jsonb default '[]',        -- 已看完 unit id 陣列
  pct             int  default 0,            -- 完成百分比（快取）
  updated_at      timestamptz default now(),
  unique(user_id, course_id)
);
create index if not exists idx_progress_user on public.progress(user_id);

-- ── 測驗作答紀錄（每次作答一列，可重考）──────────────────────
create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,
  course_id    uuid references public.courses(id) on delete cascade,
  score        int not null,                 -- 0-100
  passed       boolean not null default false,
  total        int,                          -- 題數
  correct      int,                          -- 答對數
  attempted_at timestamptz default now()
);
create index if not exists idx_attempts_user on public.quiz_attempts(user_id);
create index if not exists idx_attempts_course on public.quiz_attempts(course_id);

-- ── 稽核日誌 ────────────────────────────────────────────────
-- actor_type: 'user'(民眾) | 'admin'(後台) | 'system'
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_type  text not null default 'user',
  actor_id    uuid,                          -- users.id 或 admin_users.id
  actor_name  text,
  action      text not null,                 -- 登入成功/登入失敗/新增使用者...
  target      text,                          -- 受影響對象描述
  ip          text,
  device      text,
  created_at  timestamptz default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_actor on public.audit_logs(actor_id);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security：前端不直連 DB，一律經後端（service role）。
-- 僅開放「已發布課程內容」匿名讀取（前台瀏覽），其餘全部關閉。
-- ════════════════════════════════════════════════════════════════
alter table public.groups          enable row level security;
alter table public.admin_users     enable row level security;
alter table public.users           enable row level security;
alter table public.courses         enable row level security;
alter table public.units           enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.progress        enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.audit_logs      enable row level security;

create policy "read published courses" on public.courses        for select using (published = true);
create policy "read units"             on public.units           for select using (true);
-- quiz_questions 不開放匿名讀（避免答案外洩）；測驗一律經後端 API
-- users / admin_users / progress / quiz_attempts / audit_logs：僅 service role

-- ════════════════════════════════════════════════════════════════
-- 種子資料
-- ════════════════════════════════════════════════════════════════

-- 預設管理員：不在此插入。首次以環境變數 ADMIN_EMAIL / ADMIN_PASSWORD
-- 登入後台時，系統會自動建立此管理員帳號（bcrypt 雜湊密碼）。

-- 分組
insert into public.groups (name) values
  ('北區衛生所'), ('中區衛生所'), ('南區衛生所')
on conflict (name) do nothing;

-- 範例民眾（由管理員開通；login_code 預設＝手機號）
insert into public.users (name, phone, phone_normalized, login_code, status, group_id)
select '呂才雄', '0912345678', '0912345678', '0912345678', 'active', g.id
from public.groups g where g.name = '北區衛生所'
on conflict (login_code) do nothing;

insert into public.users (name, phone, phone_normalized, login_code, status, group_id)
select '陳秀英', '0922333444', '0922333444', '0922333444', 'active', g.id
from public.groups g where g.name = '中區衛生所'
on conflict (login_code) do nothing;

-- 範例課程（咀嚼照護主題）
insert into public.courses (title, category, description, emoji, sort_order) values
  ('咀嚼困難照護基礎', '咀嚼照護', '認識咀嚼困難的成因，學習如何協助長者安全進食，預防嗆咳與吸入性肺炎。', '🍽️', 1),
  ('吞嚥訓練與運動',   '吞嚥訓練', '透過口腔肌肉運動與吞嚥技巧訓練，改善長者吞嚥功能。', '💪', 2),
  ('飲食質地調整',     '飲食調整', '學習軟食、細碎食、糊狀食的製備方式，讓長者吃得安全又有營養。', '🥣', 3)
on conflict do nothing;
