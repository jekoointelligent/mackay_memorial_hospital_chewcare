-- migration_v8.sql
-- 1. 補 quiz_questions 缺少的欄位
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

-- 2. 首頁卡片（feature_cards）
CREATE TABLE IF NOT EXISTS public.feature_cards (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  icon        text    NOT NULL DEFAULT '✨',
  title       text    NOT NULL DEFAULT '',
  description text    DEFAULT '',
  bg_color    text    DEFAULT '#FDECEA',
  sort_order  integer NOT NULL DEFAULT 0,
  status      text    NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'archived')),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.feature_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on feature_cards"
  ON public.feature_cards FOR ALL USING (true);

-- 預設三張卡片（只在空白時插入）
INSERT INTO public.feature_cards (icon, title, description, bg_color, sort_order, status)
SELECT * FROM (VALUES
  ('🍽️'::text, '咀嚼照護教學'::text, '認識咀嚼困難成因，學習協助長者安全進食，預防嗆咳。'::text, '#FDECEA'::text, 0::integer, 'published'::text),
  ('💪'::text, '吞嚥訓練影片'::text, '口腔肌肉運動與吞嚥技巧示範，改善吞嚥功能。'::text,     '#DBEAFE'::text, 1::integer, 'published'::text),
  ('🥣'::text, '飲食質地調整'::text, '軟食、細碎食、糊狀食製備教學，吃得安全又營養。'::text,   '#D1FAE5'::text, 2::integer, 'published'::text)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM public.feature_cards LIMIT 1);

-- 3. 確保 admin_users 有 role 欄位
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
