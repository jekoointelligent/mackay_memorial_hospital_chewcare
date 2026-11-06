-- migration_v6_assets.sql
-- 安全冪等：所有 ALTER 均使用 IF NOT EXISTS，可重複執行
-- 為 materials 新增 status（三態）與 asset_type（素材分類）欄位

-- ══════════════════════════════════════════════════════════
-- ① materials 新增 status 欄位（draft / published / archived）
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- ══════════════════════════════════════════════════════════
-- ② materials 新增 asset_type 欄位（document / video / image / other）
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'document';

-- ══════════════════════════════════════════════════════════
-- ③ 資料同步：existing published=true → status='published'
-- ══════════════════════════════════════════════════════════
UPDATE public.materials
SET status = 'published'
WHERE published = true
  AND status = 'draft';

-- ══════════════════════════════════════════════════════════
-- ④ 索引
-- ══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_materials_status     ON public.materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_asset_type ON public.materials(asset_type);

-- 執行後後台「教材管理」即可顯示 status 三態（草稿/已上架/已封存）與素材類型分類
