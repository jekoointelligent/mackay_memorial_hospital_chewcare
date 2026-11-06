# 腦中風吞嚥照護衛教平台－開發文件（現況版）

> 本文件描述目前正式 `main` 已有功能，**不包含尚未併入 main 的語音 POC / Browser TTS / Browser STT 實驗功能**。

## 0. 專案狀態

- Repository：`weiwei-cai/chewcare-platform`
- 正式站：`https://chewcare-platform.onrender.com`
- 正式後台：`https://chewcare-platform.onrender.com/platform`
- 主要分支：`main`
- 本文件更新基準 commit：`2f0bb74`（`chore: update homepage text`）
- 目前正式 GitHub Release：`v1.1.0 — Interactive HTML & Progress Update`
- v1.1.0 Release commit：`b6efca2`

> `main` 目前比 v1.1.0 Release 多一筆首頁文字調整，因此 GitHub Release 與 main HEAD 並非完全相同。

---

## 1. 專案目的

本平台提供腦中風吞嚥照護相關衛教學習，主要使用者為長者、病人、家屬與照護者。

系統分為：

- 一般使用者前台
- 管理員後台
- Next.js API Routes
- Supabase PostgreSQL
- Cloudflare R2
- Render
- GitHub

一般使用者不可自行註冊，由管理員建立帳號後，以 **10 碼登入序號（login_code）** 登入。

---

## 2. 技術架構

| 層級 | 技術 |
|---|---|
| 前端 | Next.js 14.2.5 |
| React | React 18 |
| Router | Pages Router |
| API | Next.js API Routes |
| 資料庫 | Supabase PostgreSQL |
| 檔案儲存 | Cloudflare R2 |
| 部署 | Render |
| 版本管理 | GitHub |
| 管理員密碼 | bcrypt |
| Session | HMAC-SHA256 HttpOnly Cookie |

整體架構：

```text
使用者瀏覽器
      │
      ▼
Render / Next.js
 ├─ pages/index.js          前台 SPA
 ├─ pages/admin.js          後台 UI
 ├─ pages/platform.js       正式後台入口
 └─ pages/api/**            API Routes
      │
      ├──────────────► Supabase PostgreSQL
      │                使用者 / 課程 / 單元
      │                測驗 / 進度 / 素材 metadata
      │                audit logs
      │
      └──────────────► Cloudflare R2
                       MP4 / PDF / 圖片 / HTML / 教材
```

---

## 3. 入口路徑

### 一般使用者

- 前台：`/`
- 一般使用者登入目前仍整合在前台 SPA 中
- 目前 repository **沒有**獨立 `pages/login.js`

### 管理員

- 正式後台：`/platform`
- 相容入口：`/admin`
- `pages/platform.js` re-export / 導向 `pages/admin.js` 的後台核心 UI

---

## 4. 一般使用者主要功能

### 首頁

主要實作：`pages/index.js`

包含：

- 平台介紹
- 特色卡片
- 課程入口
- 公開資訊

### 課程專區

顯示：

- 已上架課程
- 課程單元
- 課程分類
- 單元數
- 學習進度

### 影片學習

主要支援：

- R2 / MP4
- YouTube
- 部分舊來源相容

R2 MP4 使用 HTML5 `<video>` 播放。

觀看過程記錄：

- `position_seconds`
- `duration_seconds`
- `progress_percent`
- `completed`

影片觀看達約 **90%** 視為單元完成。

### 測驗

流程：

```text
使用者作答
   ↓
POST /api/quiz-submit
   ↓
伺服器端計分
   ↓
quiz_attempts + unit_progress
   ↓
回傳結果與答題檢討
```

正確答案只在後端計分時讀取，作答前不下傳前端。

### 教材

素材主要存在 Cloudflare R2，支援：

- PDF
- Word
- PowerPoint
- 圖片
- 影片
- HTML
- 其他檔案

---

## 5. Interactive HTML 單元

系統已正式支援：

```text
interactive_html
```

後台流程：

```text
素材管理
→ 上傳 HTML
→ 上架
→ 課程管理
→ 建立互動網頁單元
→ 選擇 HTML 素材
```

前台透過 iframe 顯示 R2 HTML：

```html
<iframe sandbox="allow-scripts">
```

目前正式 main：

- 保留 `sandbox="allow-scripts"`
- 沒有 `allow-same-origin`
- 沒有語音 POC 使用的 iframe microphone 權限

---

## 6. HTML 素材自動辨識

共用邏輯：

```text
lib/materialType.js
```

HTML 判斷不再只依賴：

```text
file_type === "html"
```

會綜合判斷：

- `file_type`
- `mime_type`
- `file_name`
- `storage_key`
- `file_url`

支援：

- `.html`
- `.htm`
- `text/html`
- `text/html; charset=utf-8`

因此早期被存成 `file_type = other` 的 HTML 仍可被系統辨識。

---

## 7. HTML 單元進度

目前使用：

```text
units.track_progress
```

共用判斷：

```text
lib/unitProgress.js
```

規則：

- video：一律計入
- quiz：一律計入
- interactive_html：只有 `track_progress === true` 才計入
- 其他類型：不計入

例如 EAT-10 這類自我評估型 HTML 可設定：

```text
track_progress = false
```

效果：

- 不計入課程完成百分比
- 不顯示「完成本單元」
- 不寫入 `unit_progress`
- 可重複使用
- 課程列表不顯示無意義的 0% 進度條

---

## 8. 課程進度

統一進度計算：

```text
lib/progress.js
```

單元是否進入分母由：

```text
lib/unitProgress.js
```

決定。

概念：

```text
progress.pct
=
所有需要計入進度單元的 progress_percent 平均
```

主要資料表：

- `unit_progress`
- `progress`

---

## 9. 管理員主要功能

### 課程 / 單元管理

管理：

- 課程
- 單元
- 發布狀態
- 排序
- 影片
- 測驗
- Interactive HTML

### 素材管理

支援：

- PDF
- Word
- PowerPoint
- 圖片
- 影片
- HTML

檔案主要存放 Cloudflare R2；Supabase 儲存 metadata。

### 使用者管理

管理員可：

- 新增使用者
- 搜尋
- 啟用 / 停用
- 批次匯入
- 分組
- 標籤

### 測驗管理

管理：

- 題目
- 選項
- 正確答案
- 解答說明

### 學習進度

可查看使用者 / 課程 / 單元進度並匯出 CSV。

### 稽核紀錄

主要資料表：

- `audit_logs`
- `logs`

---

## 10. Session 架構

一般使用者與管理員 Session 已分離。

Cookie：

```text
chewcare_user_session
chewcare_admin_session
```

另保留過渡相容：

```text
chewcare_session
```

新程式不應再依賴舊版單一 cookie。

相關程式：

- `lib/session.js`
- `lib/helpers.js`

一般使用者：

- `getUserSession()`
- `requireUser()`

管理員：

- `getAdminSession()`
- `requireAdmin()`

`getSession()` 目前只作為相容層，新程式應優先使用角色明確的 session helper。

---

## 11. 同瀏覽器多角色登入

目前可同時：

```text
Tab A：一般使用者
Tab B：管理員
```

兩者 session 不互相覆蓋。

管理員專用 API：

- `GET /api/admin/me`
- `POST /api/admin/logout`

`/api/admin/*` 只信任 admin session。

---

## 12. 更換影片 / HTML 內容

如果只修改：

- 標題
- 說明
- 排序
- 發布狀態

不會重置學習進度。

若真的更換：

- `video_url`
- `storage_key`

後台會提供：

```text
A. 保留原有進度
B. 重置此單元進度
C. 取消
```

重置只影響該 `unit_id`，不影響其他單元或課程。

---

## 13. Cloudflare R2

主要環境變數：

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

`R2_SECRET_ACCESS_KEY` 僅 server-side 使用。

### 上傳流程

```text
Browser
  ↓
Next.js API
  ↓
產生 Presigned PUT URL
  ↓
Browser 直接 PUT R2
  ↓
storage_key / public URL / mime_type / storage_provider
寫入 Supabase
```

檔案本體不經過 Render server。

---

## 14. Supabase

主要資料表：

- `admin_users`
- `groups`
- `users`
- `courses`
- `units`
- `materials`
- `course_categories`
- `quiz_questions`
- `quiz_attempts`
- `progress`
- `unit_progress`
- `feature_cards`
- `home_banners`
- `audit_logs`
- `logs`

---

## 15. Migration 現況

目前 repository 根目錄可見：

```text
supabase/migration_v14_r2_storage.sql
supabase/migration_v15_fix_html_material_type.sql
supabase/migration_v16_html_track_progress.sql
```

### v15

用途：補正既有 HTML 素材的 `file_type`。

此 migration 為選用，因目前應用程式已使用 `lib/materialType.js` 自動判斷 HTML。

### v16

新增：

```sql
units.track_progress boolean NOT NULL DEFAULT false
```

此欄位目前程式碼已正式依賴。

---

## 16. Production Schema 重要注意事項

目前：

```text
supabase/schema_production.sql
```

**尚未包含**：

```text
units.track_progress
```

而：

```text
supabase/verify_production_schema.sql
```

目前也尚未驗證 `track_progress`。

因此在這兩份 SQL 更新完成前，全新 Supabase 環境不能只執行 `schema_production.sql`。

現階段應至少：

```text
schema_production.sql
+
migration_v16_html_track_progress.sql
```

後續應把 v16 正式整合回 `schema_production.sql` 並同步更新 verify script。

---

## 17. 環境變數

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SESSION_SECRET=

ADMIN_EMAIL=
ADMIN_PASSWORD=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

不得暴露：

- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_SECRET_ACCESS_KEY`
- `SESSION_SECRET`
- `ADMIN_PASSWORD`

---

## 18. 本機開發

```bash
npm install
cp .env.example .env.local
npm run dev
```

本機：

```text
http://localhost:3000
```

正式檢查：

```bash
npm run lint
npm run build
```

---

## 19. Render

Render Web Service：

- Build：`npm install && npm run build`
- Start：`npm run start`
- Node：20

部署設定另見：

- `render.yaml`
- `docs/DEPLOYMENT.md`

一般更新流程：

```text
修改程式
→ lint / build
→ git add
→ git commit
→ git push origin main
→ Render Auto Deploy
```

若 Auto Deploy 未啟動：

```text
Render
→ Manual Deploy
→ Deploy latest commit
```

---

## 20. Git Branch 現況

目前遠端：

```text
main
fix/progress-session-isolation
liff-test
```

### fix/progress-session-isolation

目前相對 main：

- ahead：0
- behind：6

代表主要內容已被 main 包含，可視為歷史分支。

### liff-test

目前相對 main：

- ahead：1
- behind：7

仍有 LIFF 測試 commit 尚未進 main，目前不屬於正式主線。

---

## 21. Release 現況

最新 GitHub Release：

```text
v1.1.0 — Interactive HTML & Progress Update
```

主要內容：

- Interactive HTML 單元
- HTML 素材自動辨識
- R2 HTML 支援
- HTML 自我評估是否計入進度
- 管理員 / 一般使用者 Session 分離
- 更換影片 / HTML 可保留或重置進度
- 非進度型 HTML UI 改善

Release commit：

```text
b6efca2
```

main 文件更新基準：

```text
2f0bb74
```

---

## 22. package.json 版本注意事項

目前：

```json
"version": "2.0.0"
```

正式 GitHub Release 則為：

```text
v1.1.0
```

目前版本資訊尚未統一。

正式交付與版本追蹤建議以 Git tag / GitHub Release 為主要依據，後續再統一 package.json version。

---

## 23. 主要目錄

```text
chewcare/
├─ pages/
│  ├─ index.js
│  ├─ admin.js
│  ├─ platform.js
│  └─ api/
│
├─ lib/
│  ├─ api.js
│  ├─ helpers.js
│  ├─ session.js
│  ├─ supabase.js
│  ├─ r2.js
│  ├─ rateLimit.js
│  ├─ materialType.js
│  ├─ unitProgress.js
│  └─ progress.js
│
├─ styles/
│
├─ supabase/
│  ├─ schema_production.sql
│  ├─ verify_production_schema.sql
│  ├─ migration_v14_r2_storage.sql
│  ├─ migration_v15_fix_html_material_type.sql
│  ├─ migration_v16_html_track_progress.sql
│  ├─ archive_migrations/
│  └─ README.md
│
├─ docs/
│  ├─ DEVELOPER_GUIDE.md
│  ├─ DEPLOYMENT.md
│  ├─ R2_SETUP.md
│  ├─ DATABASE.md
│  ├─ PROJECT_STRUCTURE.md
│  └─ GITHUB_RELEASE_CHECKLIST.md
│
├─ package.json
├─ render.yaml
├─ next.config.js
├─ fix-readlink.cjs
└─ .env.example
```

---

## 24. 開發安全原則

1. 不得 commit `.env.local`
2. `SUPABASE_SERVICE_ROLE_KEY` 不得進前端
3. `R2_SECRET_ACCESS_KEY` 不得進前端
4. 管理員與一般使用者 Session 必須分離
5. `/api/admin/*` 僅接受 admin session
6. 測驗正確答案不可在作答前傳給 browser
7. Interactive HTML 不使用 `dangerouslySetInnerHTML`
8. iframe 維持 sandbox
9. 修改正式資料庫前先確認 migration
10. 大型實驗功能不要直接在 main 開發

---

## 25. 建議開發流程

一般功能：

```text
main
↓
feature/xxx
↓
開發
↓
lint / build
↓
測試
↓
commit
↓
push feature branch
↓
review
↓
merge main
↓
Render deployment
↓
GitHub Release
```

Bug fix：

```text
main
↓
fix/xxx
↓
測試
↓
merge main
```

---

## 26. 目前已知待整理項目

### 文件 / Schema

後續應同步：

- README.md
- docs/DATABASE.md
- docs/PROJECT_STRUCTURE.md
- docs/GITHUB_RELEASE_CHECKLIST.md
- supabase/README.md
- supabase/schema_production.sql
- supabase/verify_production_schema.sql

其中最重要的是把 `track_progress` 正式整合回 production schema。

### 版本

建議統一：

- package.json version
- Git tag
- GitHub Release

### 舊 Branch

可評估清理：

- `fix/progress-session-isolation`

`liff-test` 則依未來是否繼續 LIFF 開發決定保留。

---

## 27. 本文件範圍

本文件只描述：

- 目前 GitHub `main`
- v1.1.0 已正式合併的功能
- main 後續首頁文字調整

**不包含尚未正式併入 main 的本機 worktree、feature branch 或語音功能 POC。**
