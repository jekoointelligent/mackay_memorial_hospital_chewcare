-- migration_v13_quiz_explanation.sql
-- 為 quiz_questions 新增 explanation 欄位（解析）
-- 測驗完成後顯示給使用者，說明為什麼這個答案正確。
-- 若欄位已存在（例如從其他遷移腳本建立），此指令安全忽略。

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation text;
