# GitHub 上線前檢查清單

執行每個步驟後請打勾確認。

---

## 一、程式碼品質

- [ ] `npm run lint` — 無 error（warning 可接受）
- [ ] `npm run build` — 建置成功，無錯誤
- [ ] 確認沒有 `console.error` 洩漏敏感資訊

---

## 二、安全性（最重要）

- [ ] `.env.local` **不在** git 追蹤中（執行 `git status` 確認）
- [ ] `.env.example` 裡所有值都是 **佔位符**，沒有真實 key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 未出現在任何 `NEXT_PUBLIC_` 變數
- [ ] `R2_SECRET_ACCESS_KEY` 未出現在任何 `NEXT_PUBLIC_` 變數
- [ ] `lib/supabase.js` 中 `supabaseAdmin` 僅用 `SUPABASE_SERVICE_ROLE_KEY`（server-side only）
- [ ] `lib/r2.js` 未被任何前端元件 import
- [ ] 測驗答案（`quiz_questions.answer`）只在 `quiz-submit.js` 讀取，不在 `quiz.js` 回傳

---

## 三、.gitignore 確認

確認 `.gitignore` 包含：

```
node_modules
.next
.env
.env.local
.env.*.local
*.log
npm-debug.log*
.DS_Store
```

執行確認：
```bash
git check-ignore -v .env.local
git check-ignore -v node_modules
```

---

## 四、Supabase 資料夾確認

確認 `supabase/` 根目錄只有：

- [ ] `schema_production.sql`
- [ ] `seed_demo.sql`
- [ ] `verify_production_schema.sql`
- [ ] `migration_v14_r2_storage.sql`
- [ ] `sample-users.csv`
- [ ] `README.md`
- [ ] `archive_migrations/`（舊版 migration，供參考）

不應有 `migration_v2.sql` ~ `migration_v13_*.sql` 在根目錄。

---

## 五、文件確認

- [ ] `README.md` 已更新（入口路徑、環境變數、部署說明）
- [ ] `docs/DEVELOPER_GUIDE.md` 存在
- [ ] `docs/DEPLOYMENT.md` 存在（含 Render 步驟）
- [ ] `docs/R2_SETUP.md` 存在
- [ ] `docs/DATABASE.md` 存在
- [ ] `docs/PROJECT_STRUCTURE.md` 存在
- [ ] `supabase/README.md` 已更新

---

## 六、功能確認

本機執行 `npm run dev`，確認：

- [ ] `/` 前台首頁正常顯示
- [ ] 一般使用者可用 login_code 登入
- [ ] `/platform` 可登入後台
- [ ] 後台各功能（課程、素材、測驗、使用者）正常
- [ ] 影片可播放（R2 URL）
- [ ] 素材可上傳到 R2
- [ ] 未登入不顯示「後台管理」按鈕
- [ ] 一般使用者登入後不顯示「後台管理」按鈕
- [ ] 管理員登入後台、返回前台，顯示「回後台」按鈕

---

## 七、Git 操作

```bash
# 確認狀態
git status

# 確認 .env.local 不在列表中
git diff --name-only HEAD

# 新增所有檔案
git add .

# 確認 staged 檔案，.env.local 不應在列
git diff --cached --name-only

# Commit
git commit -m "chore: prepare production docs and deployment setup"

# 推送（等確認 GitHub repo URL 後執行）
# git remote add origin https://github.com/你的帳號/你的repo.git
# git push -u origin main
```

---

## 八、Render 部署前確認

- [ ] GitHub repo 已建立並推送
- [ ] Supabase `schema_production.sql` 已執行
- [ ] R2 bucket 已建立，Public URL 已開啟
- [ ] R2 CORS 已設定（含正式網域）
- [ ] Render Environment Variables 全部填入
- [ ] `NODE_VERSION=20` 已設定

---

## 九、從全新環境測試

模擬全新 clone：

```bash
git clone https://github.com/你的帳號/你的repo.git
cd 你的repo
npm install
cp .env.example .env.local  # 填入真實值
npm run build
npm run start
```

確認可以正常 build 與啟動。
