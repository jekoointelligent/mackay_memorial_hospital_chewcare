# 腦中風吞嚥照護衛教平台

給長照家屬與照護者使用的吞嚥照護衛教學習平台。  
民眾以 **10 碼登入序號** 免密碼登入；帳號由管理員後台開通，不可自行註冊。

---

## 功能總覽

**前台（民眾）**
- 首頁、課程專區、關於我們
- 影片學習（HTML5 播放 + 觀看進度記錄）
- 課程教材瀏覽
- 測驗作答與答題檢討
- 學習進度儀表板

**後台（管理員）**
- 課程 / 單元 / 影片管理
- 素材管理（PDF / Word / PPT / 圖片 / HTML / 影片）
- 測驗題目管理
- 使用者管理（新增 / 批次匯入 / 搜尋 / 停啟用）
- 學習進度查看與 CSV 匯出
- 活動紀錄（稽核日誌）
- 首頁卡片管理

---

## 技術架構

| 層 | 技術 |
|----|------|
| 前端 + API | Next.js 14.2.5（Pages Router）+ React 18 |
| 資料庫 | Supabase（PostgreSQL）|
| 檔案儲存 | Cloudflare R2（影片 / 教材 / 圖片）|
| 部署 | Render |
| 版本管理 | GitHub |

---

## 入口路徑

| 角色 | 路徑 |
|------|------|
| 一般使用者 | `/` |
| 一般使用者登入 | `/login` |
| 管理員後台（主要） | `/platform` |
| 管理員後台（相容） | `/admin` |

---

## 本機開發

```bash
npm install
cp .env.example .env.local   # 填入你的值
npm run dev
```

本機網址：`http://localhost:3000`

---

## 環境變數

複製 `.env.example` 為 `.env.local` 並填入真實值：

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # 僅後端使用，絕不可放前端

SESSION_SECRET=                  # 隨機長字串

ADMIN_EMAIL=
ADMIN_PASSWORD=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=            # 僅後端使用，絕不可放前端
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

> `SESSION_SECRET` 產生方式：
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 資料庫初始化

**全新 Supabase 專案：**
```
supabase/schema_production.sql   ← 執行這一個即可
```

**已有資料庫（跑過 v2~v13）：**
```
supabase/verify_production_schema.sql   ← 先確認欄位
supabase/migration_v14_r2_storage.sql   ← 若缺 R2 欄位再補跑
```

詳見 [supabase/README.md](supabase/README.md)。

---

## R2 設定

見 [docs/R2_SETUP.md](docs/R2_SETUP.md)。

---

## Render 部署

見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

---

## 資料表一覽

| 資料表 | 用途 |
|--------|------|
| `admin_users` | 後台管理員（Email + bcrypt 密碼）|
| `groups` | 分組（衛生所 / 據點）|
| `users` | 民眾（login_code、status、last_login_at）|
| `courses` / `units` | 課程與單元（影片 / 測驗 / 文字）|
| `materials` | 素材庫（PDF / 圖片 / HTML / 影片）|
| `home_banners` | 首頁 Banner（目前暫時隱藏）|
| `feature_cards` | 首頁特色卡片 |
| `course_categories` | 課程分類 |
| `quiz_questions` | 測驗題目（答案僅後端）|
| `quiz_attempts` | 測驗作答紀錄 |
| `progress` | 課程整體進度（pct）|
| `unit_progress` | 單元觀看進度（影片秒數）|
| `audit_logs` | 稽核日誌 |

---

## 安全注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 與 `R2_SECRET_ACCESS_KEY` 僅後端 API 使用
- 兩者絕不可放入 `NEXT_PUBLIC_` 前綴變數或 commit 到 GitHub
- `.env.local` 已在 `.gitignore` 中
- 民眾無法自行註冊，帳號一律由管理員開通
- 管理員密碼以 bcrypt hash 儲存
- 測驗答案在後端計分，不下傳前端

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | 開發指南（架構、角色、進度邏輯）|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Render 部署步驟 |
| [docs/R2_SETUP.md](docs/R2_SETUP.md) | Cloudflare R2 設定 |
| [docs/DATABASE.md](docs/DATABASE.md) | 資料庫結構說明 |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | 專案資料夾結構 |
| [docs/GITHUB_RELEASE_CHECKLIST.md](docs/GITHUB_RELEASE_CHECKLIST.md) | 上線前檢查清單 |
| [supabase/README.md](supabase/README.md) | SQL 部署說明 |
