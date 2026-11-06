# 資料庫說明（Database）

Supabase（PostgreSQL）儲存所有資料與 metadata。  
媒體檔案（影片、圖片、教材）儲存於 Cloudflare R2。

---

## 資料表一覽

| 資料表 | 說明 |
|--------|------|
| `admin_users` | 後台管理員（Email + bcrypt 密碼 + role）|
| `groups` | 使用者分組（衛生所、據點）|
| `users` | 一般使用者（login_code、status、last_login_at）|
| `course_categories` | 課程分類（name、bg_color、text_color）|
| `courses` | 課程（title、description、emoji、category、published）|
| `units` | 單元（course_id、type、video_kind、video_url、storage_key、published）|
| `materials` | 素材庫（file_url、storage_key、storage_provider、asset_type）|
| `home_banners` | 首頁 Banner（目前暫時隱藏）|
| `feature_cards` | 首頁特色卡片 |
| `quiz_questions` | 測驗題目（answer 欄位僅後端讀取）|
| `quiz_attempts` | 測驗作答紀錄（score、passed）|
| `progress` | 課程整體進度（pct、completed_units[]）|
| `unit_progress` | 單元觀看進度（progress_percent、last_position_seconds）|
| `audit_logs` | 稽核日誌（actor_type、action、target、ip、device）|
| `logs` | 登入紀錄 |

---

## 進度相關資料表關係

```
users
  └── progress (user_id, course_id, pct, completed_units[])
  └── unit_progress (user_id, unit_id, course_id, progress_percent, completed)
  └── quiz_attempts (user_id, course_id, score, passed)
```

- `unit_progress` 有 `UNIQUE(user_id, unit_id)` 限制，使用 upsert
- `progress` 有 `UNIQUE(user_id, course_id)` 限制，使用 upsert
- `progress.pct` = 所有可完成單元的 `progress_percent` 平均值

---

## 初始化新 Supabase 專案

只需執行一個檔案：

```
supabase/schema_production.sql
```

此檔案使用 `IF NOT EXISTS` 設計，可重複執行（idempotent）。  
包含：所有資料表、索引、RLS 規則。  
**不含** seed 資料。

---

## 現有資料庫補充 Migration

已在 v2~v13 上的資料庫，不需要重跑 schema_production.sql。  
只需確認欄位是否齊全：

```sql
-- 先確認欄位
supabase/verify_production_schema.sql

-- 若缺少 R2 相關欄位（storage_key / storage_provider / mime_type）
supabase/migration_v14_r2_storage.sql
```

---

## archive_migrations 說明

`supabase/archive_migrations/` 保留 v2~v13 開發歷史：

| 檔案 | 說明 |
|------|------|
| `migration_v2.sql` | groups / admin_users / units 補欄位 |
| `migration_v3.sql` | v2 補強 |
| `migration_v4_fix_quiz_units.sql` | quiz_questions created_at 修復 |
| `migration_v5_materials_video_progress.sql` | 新增 materials / unit_progress |
| `migration_v6_assets.sql` | materials 新增 status / asset_type |
| `migration_v7_home_banners.sql` | 新增 home_banners |
| `migration_v8.sql` | 新增 feature_cards |
| `migration_v9_user_tags.sql` | users 新增 tags |
| `migration_v10_categories.sql` | 新增 course_categories |
| `migration_v11_quiz_unit.sql` | quiz_questions 新增 unit_id |
| `migration_v12_units_r2.sql` | units 新增 R2 欄位 |
| `migration_v13_quiz_explanation.sql` | quiz_questions 確認 explanation |

**正式部署時不要逐一跑這些舊 migration**，請用 `schema_production.sql`。

---

## RLS（Row Level Security）

目前 RLS 已啟用但 policy 讓 `service_role` key 可全讀寫。  
前台 API 透過後端 API Routes 存取資料，使用 `supabaseAdmin`（service role），  
不直接從瀏覽器存取 Supabase。

---

## 敏感欄位說明

| 欄位 | 說明 |
|------|------|
| `users.login_code` | 10 碼登入序號，不是密碼，有 IP 速率限制保護 |
| `admin_users.password_hash` | bcrypt hash，不儲存明文 |
| `quiz_questions.answer` | 只在後端 `quiz-submit.js` 讀取，不下傳前端 |
