-- ════════════════════════════════════════════════════════════════
-- 咀嚼照護衛教平台 — Demo 種子資料
-- 僅用於測試環境，正式部署「不要」執行此檔案。
--
-- 執行順序：
--   1. schema_production.sql   ← 先建立所有資料表
--   2. seed_demo.sql           ← 再匯入此測試資料
--
-- 全部使用 ON CONFLICT DO NOTHING，可安全重複執行。
-- ════════════════════════════════════════════════════════════════

-- ── 分組 ────────────────────────────────────────────────────────
INSERT INTO public.groups (name, description, sort_order, status) VALUES
  ('北區衛生所', '北部地區', 0, 'active'),
  ('中區衛生所', '中部地區', 1, 'active'),
  ('南區衛生所', '南部地區', 2, 'active')
ON CONFLICT (name) DO NOTHING;

-- ── 課程分類 ────────────────────────────────────────────────────
INSERT INTO public.course_categories (name, bg_color, text_color, sort_order, status) VALUES
  ('咀嚼照護', '#FDECEA', '#E8392A', 0, 'active'),
  ('吞嚥訓練', '#DBEAFE', '#1A73E8', 1, 'active'),
  ('飲食調整', '#D1FAE5', '#10B981', 2, 'active')
ON CONFLICT (name) DO NOTHING;

-- ── 民眾（測試用，login_code 請勿用於正式環境）──────────────────
INSERT INTO public.users (name, phone, phone_normalized, login_code, status, group_id)
SELECT '測試民眾甲', '0912000001', '0912000001', '0912000001', 'active', g.id
FROM public.groups g WHERE g.name = '北區衛生所'
ON CONFLICT (login_code) DO NOTHING;

INSERT INTO public.users (name, phone, phone_normalized, login_code, status, group_id)
SELECT '測試民眾乙', '0912000002', '0912000002', '0912000002', 'active', g.id
FROM public.groups g WHERE g.name = '中區衛生所'
ON CONFLICT (login_code) DO NOTHING;

-- ── 課程 ────────────────────────────────────────────────────────
INSERT INTO public.courses (title, category, description, emoji, sort_order, published) VALUES
  ('咀嚼困難照護基礎', '咀嚼照護', '認識咀嚼困難的成因，學習如何協助長者安全進食，預防嗆咳與吸入性肺炎。', '🍽️', 0, true),
  ('吞嚥訓練與運動',   '吞嚥訓練', '透過口腔肌肉運動與吞嚥技巧訓練，改善長者吞嚥功能。',                   '💪',  1, true),
  ('飲食質地調整',     '飲食調整', '學習軟食、細碎食、糊狀食的製備方式，讓長者吃得安全又有營養。',          '🥣',  2, true)
ON CONFLICT DO NOTHING;

-- ── 首頁功能卡片 ─────────────────────────────────────────────────
INSERT INTO public.feature_cards (icon, title, description, bg_color, sort_order, status)
SELECT * FROM (VALUES
  ('🍽️'::text, '咀嚼照護教學'::text, '認識咀嚼困難成因，學習協助長者安全進食，預防嗆咳。'::text,        '#FDECEA'::text, 0::integer, 'published'::text),
  ('💪'::text, '吞嚥訓練影片'::text, '口腔肌肉運動與吞嚥技巧示範，改善吞嚥功能。'::text,                '#DBEAFE'::text, 1::integer, 'published'::text),
  ('🥣'::text, '飲食質地調整'::text, '軟食、細碎食、糊狀食製備教學，吃得安全又營養。'::text,             '#D1FAE5'::text, 2::integer, 'published'::text)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM public.feature_cards LIMIT 1);
