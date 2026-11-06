# 專案資料夾結構

```
chewcare/
├── docs/                             # 開發與部署文件
│   ├── DEVELOPER_GUIDE.md            # 開發指南（架構、角色、進度邏輯）
│   ├── DEPLOYMENT.md                 # Render 部署步驟
│   ├── R2_SETUP.md                   # Cloudflare R2 設定
│   ├── DATABASE.md                   # 資料庫結構說明
│   ├── PROJECT_STRUCTURE.md          # 本文件
│   └── GITHUB_RELEASE_CHECKLIST.md   # 上線前檢查清單
│
├── lib/                              # 共用工具（server-side + shared）
│   ├── api.js                        # 前端 API wrapper（jf 封裝）
│   ├── guard.js                      # requireAdmin helper（API routes 用）
│   ├── helpers.js                    # audit、requireAdmin、requireUser
│   ├── r2.js                         # R2 工具（僅 server-side）
│   ├── rateLimit.js                  # IP 速率限制
│   ├── session.js                    # HMAC session cookie 簽發與驗證
│   ├── siteConfig.js                 # 網站名稱、logo 設定
│   └── supabase.js                   # supabaseAdmin client（僅 server-side）
│
├── pages/
│   ├── _app.js                       # Next.js App（全域樣式、字體）
│   ├── index.js                      # 前台（SPA：首頁/課程/登入/測驗/儀表板）
│   ├── admin.js                      # 後台管理介面（/admin）
│   ├── platform.js                   # 後台入口（/platform）→ re-export admin.js
│   ├── privacy.js                    # 隱私權政策
│   └── api/
│       ├── auth/
│       │   ├── login.js              # 民眾登入（10 碼序號）
│       │   ├── logout.js             # 登出
│       │   └── me.js                 # 取得目前 session
│       ├── admin/
│       │   ├── login.js              # 管理員登入
│       │   ├── admin-users.js        # 管理員帳號 CRUD
│       │   ├── users.js              # 使用者 CRUD
│       │   ├── groups.js             # 分組 CRUD
│       │   ├── content.js            # 課程 / 單元 CRUD
│       │   ├── quiz.js               # 測驗題目 CRUD
│       │   ├── materials.js          # 素材 CRUD（含 R2 刪除）
│       │   ├── banners.js            # Banner CRUD（功能保留，UI 暫隱藏）
│       │   ├── feature-cards.js      # 首頁卡片 CRUD
│       │   ├── categories.js         # 課程分類 CRUD
│       │   ├── r2-upload.js          # R2 presigned PUT URL（通用）
│       │   ├── r2-status.js          # R2 設定狀態檢查
│       │   ├── material-upload-url.js # 素材 R2 上傳 URL
│       │   ├── banner-upload-url.js  # Banner R2 上傳 URL
│       │   ├── upload-url.js         # 舊版 Supabase Storage（保留相容）
│       │   ├── import-users.js       # 批次匯入使用者
│       │   ├── export.js             # CSV 匯出
│       │   ├── overview.js           # 儀表板統計
│       │   ├── course-sort.js        # 課程排序
│       │   ├── unit-sort.js          # 單元排序
│       │   └── tags.js               # 使用者標籤
│       ├── courses.js                # 課程列表（含進度）
│       ├── course-materials.js       # 課程教材列表
│       ├── quiz.js                   # 前台讀取測驗題目（不含答案）
│       ├── quiz-submit.js            # 測驗提交與計分（後端）
│       ├── progress.js               # 標記單元完成
│       ├── video-progress.js         # 影片觀看進度讀寫
│       └── public/
│           ├── banners.js            # 公開 Banner API
│           ├── feature-cards.js      # 公開首頁卡片 API
│           ├── categories.js         # 公開課程分類 API
│           └── stats.js              # 公開統計 API
│
├── styles/
│   └── globals.css                   # 全域樣式（大字體無障礙、RWD）
│
├── supabase/
│   ├── schema_production.sql         # 正式 schema（新環境執行這個）
│   ├── seed_demo.sql                 # Demo 種子資料（測試用，正式不跑）
│   ├── verify_production_schema.sql  # 欄位驗證查詢
│   ├── migration_v14_r2_storage.sql  # R2 欄位補丁（既有 DB 補跑）
│   ├── sample-users.csv              # 批次匯入範本
│   ├── README.md                     # SQL 部署說明
│   └── archive_migrations/           # 歷史 migration（v2~v13，僅供參考）
│
├── .env.example                      # 環境變數範本（不含真實值）
├── .gitignore                        # 排除 .env.local、.next、node_modules 等
├── fix-readlink.cjs                  # Windows 環境 Next.js 相容修正
├── next.config.js                    # Next.js 設定
├── package.json                      # 相依套件與 scripts
├── render.yaml                       # Render 部署設定（選用）
└── README.md                         # 快速入門說明
```

---

## 重要說明

### 不提交至 GitHub 的檔案（.gitignore）

```
.env.local        # 本機環境變數（含 secrets）
.env.*.local      # 其他本機環境變數
.next/            # Next.js build 輸出
node_modules/     # 套件（從 package.json 重新安裝）
*.log             # 日誌
.DS_Store         # macOS 系統檔
```

### 單一 Port 架構

前台、後台、API 全部跑在同一個 Next.js 服務（`localhost:3000`）：
- `/` 前台
- `/platform`、`/admin` 後台
- `/api/*` 公開 API
- `/api/admin/*` 後台 API（需 admin session）
