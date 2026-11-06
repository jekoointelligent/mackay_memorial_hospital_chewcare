# 開發文件索引

本資料夾存放「腦中風吞嚥照護衛教平台」的開發、部署、資料庫與維運相關文件。

如果是第一次接觸本專案，建議先閱讀：

1. `DEVELOPER_GUIDE.md`
2. `PROJECT_STRUCTURE.md`
3. 再依需求查看資料庫、R2 或部署文件

---

## 文件一覽

| 文件 | 用途 | 建議閱讀時機 |
|---|---|---|
| `DEVELOPER_GUIDE.md` | **主要開發文件**。說明目前正式系統架構、前後台功能、Session、Interactive HTML、課程進度、R2、Supabase、Render 與目前版本狀態。 | 第一次接手專案時優先閱讀 |
| `PROJECT_STRUCTURE.md` | 說明專案資料夾、主要程式檔案及 API 所在位置。 | 要開始找程式碼、修改功能時 |
| `DATABASE.md` | 說明 Supabase 資料表、資料關係、Migration 與 Production Schema。 | 修改資料庫、欄位、進度邏輯時 |
| `R2_SETUP.md` | 說明 Cloudflare R2 Bucket、API Token、CORS、Public URL 與環境變數設定。 | 設定素材／影片儲存或排查上傳問題時 |
| `DEPLOYMENT.md` | 說明 Render Web Service、環境變數、Build / Start Command 與正式部署流程。 | 建立正式環境、重新部署或搬移主機時 |
| `GITHUB_RELEASE_CHECKLIST.md` | 上線前檢查清單，包含 lint、build、安全性、環境變數、資料庫與功能驗收。 | 準備 merge main、部署或建立 Release 前 |

---

## 建議閱讀順序

### 新接手開發

```text
DEVELOPER_GUIDE.md
        ↓
PROJECT_STRUCTURE.md
        ↓
DATABASE.md
        ↓
R2_SETUP.md
        ↓
DEPLOYMENT.md
```

### 要修改一般功能

```text
DEVELOPER_GUIDE.md
        ↓
PROJECT_STRUCTURE.md
        ↓
找到對應 pages / lib / API
```

### 要修改資料庫

```text
DATABASE.md
        ↓
supabase/README.md
        ↓
schema / migration
```

### 要處理素材、影片、HTML

```text
DEVELOPER_GUIDE.md
        ↓
R2_SETUP.md
```

### 要正式發布

```text
GITHUB_RELEASE_CHECKLIST.md
        ↓
DEPLOYMENT.md
        ↓
GitHub Release
```

---

## 其他重要文件

### 專案根目錄

`README.md`

用途：

- 專案快速介紹
- 技術架構摘要
- 本機啟動方式
- 環境變數
- 文件入口

### Supabase 資料夾

`supabase/README.md`

用途：

- Supabase Schema 初始化
- Migration 使用方式
- Existing Database 更新方式

---

## 文件維護原則

### 新增功能

更新：

```text
DEVELOPER_GUIDE.md
PROJECT_STRUCTURE.md
```

若涉及資料庫，再同步更新：

```text
DATABASE.md
supabase/README.md
```

### 新增 Migration

更新：

```text
DATABASE.md
supabase/README.md
PROJECT_STRUCTURE.md
```

並確認：

```text
schema_production.sql
verify_production_schema.sql
```

是否需要同步修改。

### 修改部署方式

更新：

```text
DEPLOYMENT.md
README.md
```

### 修改 R2 / Storage

更新：

```text
R2_SETUP.md
DEVELOPER_GUIDE.md
```

---

## 正式文件原則

`main` 分支中的文件應描述：

> **目前已正式合併至 main 的功能**

尚未合併的：

- Feature branch
- POC
- 本機 Worktree
- 測試功能

原則上不要提前寫進正式開發文件。

如果需要紀錄實驗功能，可在對應 Feature Branch 中建立獨立說明文件，待功能正式合併後再整合至主要文件。
