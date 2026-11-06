-- migration_v11_quiz_unit.sql
-- 讓測驗題目可以綁定特定課程單元（quiz unit）
-- 執行後，後台「測驗管理」可將題目指定給特定測驗單元；前台點測驗單元時顯示該單元的題目

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS quiz_questions_unit_id_idx ON public.quiz_questions(unit_id);

-- 注意：已存在的題目 unit_id = NULL，代表「課程層級」題目（舊版行為）
-- 新增題目時可在後台選擇要綁定哪一個測驗單元
