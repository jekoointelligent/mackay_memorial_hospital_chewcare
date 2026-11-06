-- migration_v5_materials_video_progress.sql
-- 安全冪等：所有建立均使用 IF NOT EXISTS，可重複執行
-- 新增教材管理 (materials) 與影片觀看進度 (unit_progress)

-- ══════════════════════════════════════════════════════════
-- ① 教材檔案資料表
-- ══════════════════════════════════════════════════════════
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  file_name     text not null,            -- 原始檔名（含副檔名）
  file_path     text not null,            -- Storage 路徑
  file_url      text not null,            -- 公開存取 URL
  file_type     text,                     -- pdf | docx | pptx | image | other
  file_size     bigint default 0,         -- 位元組
  course_id     uuid references public.courses(id)   on delete set null,
  unit_id       uuid references public.units(id)     on delete set null,
  published     boolean not null default true,
  sort_order    int     not null default 0,
  uploaded_by   uuid references public.admin_users(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_materials_course   on public.materials(course_id);
create index if not exists idx_materials_unit     on public.materials(unit_id);
create index if not exists idx_materials_pub      on public.materials(published);

alter table public.materials enable row level security;
-- 前台可讀已上架教材（service role bypasses）
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='materials' and policyname='read published materials'
  ) then
    create policy "read published materials" on public.materials for select using (published = true);
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- ② 影片觀看進度資料表（每位使用者 × 每個影片單元）
-- ══════════════════════════════════════════════════════════
create table if not exists public.unit_progress (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.users(id)    on delete cascade,
  unit_id               uuid references public.units(id)    on delete cascade,
  course_id             uuid references public.courses(id)  on delete cascade,
  last_position_seconds int     not null default 0,
  duration_seconds      int     not null default 0,
  progress_percent      int     not null default 0,
  completed             boolean not null default false,
  updated_at            timestamptz default now(),
  unique(user_id, unit_id)
);
create index if not exists idx_unit_progress_user   on public.unit_progress(user_id);
create index if not exists idx_unit_progress_course on public.unit_progress(course_id);

alter table public.unit_progress enable row level security;
-- 僅 service role 可操作（前端不直連 DB）

-- ══════════════════════════════════════════════════════════
-- 執行後請在 Supabase Dashboard → Storage 建立 bucket:
--   名稱：materials
--   Public: true（讓 file_url 可直接下載）
-- ══════════════════════════════════════════════════════════
