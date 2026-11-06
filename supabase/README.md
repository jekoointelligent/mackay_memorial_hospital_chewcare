# Supabase 資料庫說明

## 檔案總覽

| 檔案 | 用途 |
|------|------|
| `schema_production.sql` | **正式初始化**：全新 Supabase 專案請執行此檔案 |
| `seed_demo.sql` | **測試用種子資料**：可選，正式環境不要執行 |
| `verify_production_schema.sql` | **驗證查詢**：確認資料庫欄位是否齊全 |
| `archive_migrations/` | 開發歷史 migration（v2~v13），保留備份用 |

---

## 新專案初始化步驟

**全新 Supabase 專案** 請依序執行：

### Step 1：執行 Production Schema
在 Supabase Dashboard → SQL Editor 貼上並執行：
```
schema_production.sql
```
這會建立所有資料表、索引、RLS 規則。

### Step 2（選用）：匯入 Demo 資料
如果要測試，再執行：
```
seed_demo.sql
```
正式環境**不要**執行此檔案，避免混入測試資料。

### Step 3：設定 Storage Bucket
在 Supabase Dashboard → Storage 建立：
- `materials`（Public: true）— 課程教材
- `banners`（Public: true）— Banner 圖片

若使用 Cloudflare R2，不需要在 Supabase Storage 建立 bucket，請設定 `.env.local` 中的 R2 相關變數。

### Step 4：設定環境變數
`.env.local` 必填：
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 絕不放前端，僅後端 API 使用
SESSION_SECRET=
```

---

## 已有資料庫（曾執行 v2~v13）是否要再跑 schema_production.sql？

**不需要，也不建議。**

`schema_production.sql` 使用 `CREATE TABLE IF NOT EXISTS` 設計，重複執行不會爆掉，但可能會對已有資料的資料表產生預料外的效果（例如 RLS Policy 如果名稱已存在會跳過）。

**推薦做法**：若目前 Supabase 已完整跑過 v2~v13，使用 `verify_production_schema.sql` 確認所有欄位是否齊全，只補執行缺少的部分即可。

---

## 驗證現有資料庫

對已在線上運行的資料庫，執行：
```
verify_production_schema.sql
```
查看是否有欄位顯示 `MISSING`，若有，對照下表執行對應 migration：

| 缺少欄位 | 執行檔案 |
|----------|----------|
| `quiz_questions.unit_id` | `archive_migrations/migration_v11_quiz_unit.sql` |
| `quiz_questions.explanation` | `archive_migrations/migration_v13_quiz_explanation.sql` |
| `units.source_type` 等 R2 欄位 | `archive_migrations/migration_v12_units_r2.sql` |
| `materials.status`, `asset_type` | `archive_migrations/migration_v6_assets.sql` |
| 缺少 `unit_progress` 資料表 | `archive_migrations/migration_v5_materials_video_progress.sql` |
| 缺少 `home_banners` 資料表 | `archive_migrations/migration_v7_home_banners.sql` |
| 缺少 `feature_cards` 資料表 | `archive_migrations/migration_v8.sql` |
| 缺少 `course_categories` 資料表 | `archive_migrations/migration_v10_categories.sql` |
| `users.tags` 欄位 | `archive_migrations/migration_v9_user_tags.sql` |

---

## archive_migrations/ 說明

這個資料夾保留 v2~v13 的開發歷史 migration，僅供參考與補丁使用：

```
archive_migrations/
  migration_v2.sql                        groups/admin_users/units 補欄位
  migration_v3.sql                        v2 補強版
  migration_v4_fix_quiz_units.sql         quiz_questions created_at 修復
  migration_v5_materials_video_progress.sql  新增 materials / unit_progress
  migration_v6_assets.sql                 materials 新增 status / asset_type
  migration_v7_home_banners.sql           新增 home_banners
  migration_v8.sql                        新增 feature_cards
  migration_v9_user_tags.sql              users 新增 tags 欄位
  migration_v10_categories.sql            新增 course_categories
  migration_v11_quiz_unit.sql             quiz_questions 新增 unit_id
  migration_v12_units_r2.sql              units 新增 R2 儲存欄位
  migration_v13_quiz_explanation.sql      quiz_questions 確認 explanation 欄位
```

**正式部署時不要一個一個跑這些舊 migration**，請使用 `schema_production.sql`。

---

## Cloudflare R2 費用說明

R2 **沒有 egress（對外傳輸）費**，前台播放影片不會被收取對外流量費。

### 免費額度（每月）
| 類型 | 免費額度 |
|------|---------|
| Storage | 10 GB |
| Class A operations（上傳、建立、列出） | 1,000,000 次 |
| Class B operations（讀取、播放、GET） | 10,000,000 次 |

### 費用規模估算
- 少量影片上傳（< 10GB / month）：通常在免費額度內
- 大量使用者觀看影片：主要增加 Class B operations，而非 egress 費用
- 超出免費額度後：Class A $4.50 / 百萬次、Class B $0.36 / 百萬次

詳見 [Cloudflare R2 定價頁](https://www.cloudflare.com/developer-platform/r2/)。

---

## 安全注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 只能在後端 API 使用，絕不可放前端或 commit 到版本庫
- `.env.local` 已在 `.gitignore` 中，請確認不要 commit
- 民眾無法自行註冊，所有帳號一律由管理員在後台開通
- 管理員密碼以 bcrypt hash 儲存
