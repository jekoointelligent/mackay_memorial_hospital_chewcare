-- migration_v7_home_banners.sql
-- 首頁 Banner 管理：建立 home_banners 資料表
-- 執行前請先在 Supabase Dashboard → Storage 建立名為 banners 的 bucket（Public: true）

CREATE TABLE IF NOT EXISTS public.home_banners (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text    NOT NULL DEFAULT '',
  subtitle    text    DEFAULT '',
  image_url   text    DEFAULT '',
  image_path  text    DEFAULT '',
  link_url    text    DEFAULT '',
  button_text text    DEFAULT '了解更多',
  sort_order  integer NOT NULL DEFAULT 0,
  status      text    NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'archived')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

-- service role (後端) 有完整存取權；前台透過 API 取資料，不直接存取 Supabase
CREATE POLICY "service role full access on home_banners"
  ON public.home_banners FOR ALL USING (true);
