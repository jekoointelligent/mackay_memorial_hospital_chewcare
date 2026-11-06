-- migration_v10_categories.sql
-- 課程分類管理（後台可新增/編輯/刪除）
CREATE TABLE IF NOT EXISTS public.course_categories (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text    NOT NULL UNIQUE,
  bg_color    text    NOT NULL DEFAULT '#FDECEA',
  text_color  text    NOT NULL DEFAULT '#E8392A',
  sort_order  integer NOT NULL DEFAULT 0,
  status      text    NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on course_categories"
  ON public.course_categories FOR ALL USING (true);

